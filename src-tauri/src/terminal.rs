use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::State;

const HIGH_WATER: i64 = 1024 * 1024;
const READ_BUF: usize = 64 * 1024;
const SCROLLBACK_CAP: usize = 256 * 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum PtyEvent {
    Data { data: String, bytes: i64 },
    Exit,
}

struct Session {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    pending: Arc<(Mutex<i64>, Condvar)>,
    channel: Arc<Mutex<Option<Channel<PtyEvent>>>>,
    scrollback: Arc<Mutex<String>>,
    alive: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct PtyState(Mutex<HashMap<u32, Session>>);

static NEXT_ID: AtomicU32 = AtomicU32::new(1);

fn drain_utf8(buf: &mut Vec<u8>) -> String {
    match std::str::from_utf8(buf) {
        Ok(s) => {
            let s = s.to_string();
            buf.clear();
            s
        }
        Err(e) => {
            let valid = e.valid_up_to();
            if e.error_len().is_none() && buf.len() - valid < 4 {
                let s = String::from_utf8_lossy(&buf[..valid]).into_owned();
                buf.drain(..valid);
                s
            } else {
                let s = String::from_utf8_lossy(buf).into_owned();
                buf.clear();
                s
            }
        }
    }
}

fn push_scrollback(store: &Mutex<String>, data: &str) {
    let mut s = store.lock().unwrap();
    s.push_str(data);
    if s.len() > SCROLLBACK_CAP {
        let mut cut = s.len() - SCROLLBACK_CAP;
        while cut < s.len() && !s.is_char_boundary(cut) {
            cut += 1;
        }
        s.drain(..cut);
    }
}

fn default_shell() -> (String, Vec<String>) {
    if cfg!(windows) {
        ("powershell.exe".into(), vec![])
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
        (shell, vec!["-l".into()])
    }
}

const ZSH_INTEGRATION: &str = r#"L8IDE_ZDOTDIR_USER="${L8IDE_ZDOTDIR_USER:-$HOME}"
ZDOTDIR="$L8IDE_ZDOTDIR_USER"
[[ -f "$ZDOTDIR/.zshrc" ]] && source "$ZDOTDIR/.zshrc"
__l8ide_osc() { printf '\033]%s\007' "$1"; }
__l8ide_preexec() { __l8ide_osc "633;E;${1//;/\\x3b}"; __l8ide_osc "633;C"; }
__l8ide_precmd() {
  local ret=$?
  __l8ide_osc "633;D;$ret"
  __l8ide_osc "633;P;Cwd=$PWD"
  __l8ide_osc "633;A"
}
autoload -Uz add-zsh-hook 2>/dev/null
if command -v add-zsh-hook >/dev/null 2>&1; then
  add-zsh-hook preexec __l8ide_preexec
  add-zsh-hook precmd __l8ide_precmd
else
  precmd_functions+=(__l8ide_precmd)
  preexec_functions+=(__l8ide_preexec)
fi
__l8ide_osc "633;A"
"#;

const BASH_INTEGRATION: &str = r#"[ -f /etc/bash.bashrc ] && source /etc/bash.bashrc
[ -f ~/.bashrc ] && source ~/.bashrc
__l8ide_osc() { printf '\033]%s\007' "$1"; }
__l8ide_in_prompt=1
__l8ide_preexec() {
  [ -n "$COMP_LINE" ] && return
  [ "$__l8ide_in_prompt" = "1" ] && return
  __l8ide_in_prompt=1
  __l8ide_osc "633;E;${1//;/\\x3b}"
  __l8ide_osc "633;C"
}
__l8ide_precmd() {
  local ret=$?
  __l8ide_osc "633;D;$ret"
  __l8ide_osc "633;P;Cwd=$PWD"
  __l8ide_osc "633;A"
  __l8ide_in_prompt=0
}
trap '__l8ide_preexec "$BASH_COMMAND"' DEBUG
__l8ide_orig_pc="$PROMPT_COMMAND"
PROMPT_COMMAND='__l8ide_precmd'"${__l8ide_orig_pc:+; $__l8ide_orig_pc}"
"#;

fn write_integration_script(name: &str, body: &str) -> Option<std::path::PathBuf> {
    let dir = std::env::temp_dir().join("l8ide-shellint");
    std::fs::create_dir_all(&dir).ok()?;
    let path = dir.join(name);
    std::fs::write(&path, body).ok()?;
    Some(path)
}

fn apply_integration(cmd: &mut CommandBuilder, shell: &str, args: &mut Vec<String>) {
    let base = shell.rsplit(['/', '\\']).next().unwrap_or(shell);
    match base {
        "zsh" => {
            let orig = std::env::var("ZDOTDIR")
                .ok()
                .or_else(|| std::env::var("HOME").ok())
                .unwrap_or_default();
            if let Some(path) = write_integration_script("l8ide.zsh", ZSH_INTEGRATION) {
                if let Some(dir) = path.parent() {
                    std::fs::copy(&path, dir.join(".zshrc")).ok();
                    cmd.env("ZDOTDIR", dir);
                    cmd.env("L8IDE_ZDOTDIR_USER", orig);
                }
            }
        }
        "bash" => {
            if let Some(path) = write_integration_script("l8ide.bash", BASH_INTEGRATION) {
                args.retain(|a| a != "-l" && a != "--login");
                args.insert(0, path.to_string_lossy().into_owned());
                args.insert(0, "--rcfile".into());
            }
        }
        _ => {}
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShellProfile {
    id: String,
    label: String,
    path: String,
    args: Vec<String>,
}

fn probe(candidates: &[&str]) -> Option<String> {
    for c in candidates {
        if std::path::Path::new(c).exists() {
            return Some((*c).to_string());
        }
    }
    None
}

#[tauri::command]
pub fn pty_profiles() -> Vec<ShellProfile> {
    let mut out = Vec::new();
    if cfg!(windows) {
        out.push(ShellProfile {
            id: "powershell".into(),
            label: "PowerShell".into(),
            path: "powershell.exe".into(),
            args: vec![],
        });
        out.push(ShellProfile {
            id: "cmd".into(),
            label: "Command Prompt".into(),
            path: "cmd.exe".into(),
            args: vec![],
        });
        if let Some(p) = probe(&["pwsh.exe"]) {
            out.push(ShellProfile { id: "pwsh".into(), label: "PowerShell Core".into(), path: p, args: vec![] });
        }
        out.push(ShellProfile {
            id: "wsl".into(),
            label: "WSL".into(),
            path: "wsl.exe".into(),
            args: vec![],
        });
    } else {
        let shells: &[(&str, &str, &[&str])] = &[
            ("zsh", "zsh", &["/bin/zsh", "/usr/bin/zsh", "/usr/local/bin/zsh", "/opt/homebrew/bin/zsh"]),
            ("bash", "bash", &["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash", "/opt/homebrew/bin/bash"]),
            ("fish", "fish", &["/usr/bin/fish", "/usr/local/bin/fish", "/opt/homebrew/bin/fish"]),
            ("pwsh", "PowerShell", &["/usr/bin/pwsh", "/usr/local/bin/pwsh", "/opt/homebrew/bin/pwsh"]),
            ("nu", "Nushell", &["/usr/bin/nu", "/usr/local/bin/nu", "/opt/homebrew/bin/nu"]),
            ("sh", "sh", &["/bin/sh"]),
        ];
        for (id, label, paths) in shells {
            if let Some(path) = probe(paths) {
                let args = if *id == "zsh" || *id == "bash" {
                    vec!["-l".to_string()]
                } else {
                    vec![]
                };
                out.push(ShellProfile { id: (*id).into(), label: (*label).into(), path, args });
            }
        }
    }
    out
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn pty_spawn(
    state: State<PtyState>,
    shell: Option<String>,
    args: Option<Vec<String>>,
    env: Option<HashMap<String, String>>,
    cwd: Option<String>,
    integration: Option<bool>,
    cols: u16,
    rows: u16,
    on_event: Channel<PtyEvent>,
) -> Result<u32, String> {
    let pair = native_pty_system()
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let (default_path, default_args) = default_shell();
    let shell_path = shell.unwrap_or(default_path);
    let mut shell_args = args.unwrap_or(default_args);

    let mut cmd = CommandBuilder::new(&shell_path);
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    if let Some(env) = env {
        for (k, v) in env {
            cmd.env(k, v);
        }
    }
    if integration.unwrap_or(true) {
        cmd.env("L8IDE_SHELL_INTEGRATION", "1");
        apply_integration(&mut cmd, &shell_path, &mut shell_args);
    }
    for arg in shell_args {
        cmd.arg(arg);
    }
    let cwd = cwd.or_else(|| std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")).ok());
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    drop(pair.slave);

    let killer = child.clone_killer();
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let pending = Arc::new((Mutex::new(0i64), Condvar::new()));
    let channel = Arc::new(Mutex::new(Some(on_event)));
    let scrollback = Arc::new(Mutex::new(String::new()));
    let alive = Arc::new(AtomicBool::new(true));

    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    state.0.lock().unwrap().insert(
        id,
        Session {
            writer,
            master: pair.master,
            killer,
            pending: pending.clone(),
            channel: channel.clone(),
            scrollback: scrollback.clone(),
            alive: alive.clone(),
        },
    );

    std::thread::spawn(move || {
        let mut buf = [0u8; READ_BUF];
        let mut carry: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    carry.extend_from_slice(&buf[..n]);
                    let data = drain_utf8(&mut carry);
                    if data.is_empty() {
                        continue;
                    }
                    push_scrollback(&scrollback, &data);
                    let bytes = data.len() as i64;
                    let ch = channel.lock().unwrap().clone();
                    if let Some(ch) = ch {
                        if ch.send(PtyEvent::Data { data, bytes }).is_ok() {
                            let (lock, cvar) = &*pending;
                            let mut outstanding = lock.lock().unwrap();
                            *outstanding += bytes;
                            while *outstanding > HIGH_WATER {
                                let (guard, timeout) = cvar
                                    .wait_timeout(outstanding, Duration::from_secs(5))
                                    .unwrap();
                                outstanding = guard;
                                if timeout.timed_out() {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        alive.store(false, Ordering::Relaxed);
        let _ = child.wait();
        if let Some(ch) = channel.lock().unwrap().clone() {
            let _ = ch.send(PtyEvent::Exit);
        }
    });

    Ok(id)
}

#[tauri::command]
pub fn pty_reconnect(
    state: State<PtyState>,
    id: u32,
    on_event: Channel<PtyEvent>,
) -> Result<bool, String> {
    let sessions = state.0.lock().unwrap();
    let Some(session) = sessions.get(&id) else {
        return Ok(false);
    };
    if !session.alive.load(Ordering::Relaxed) {
        return Ok(false);
    }
    let snapshot = session.scrollback.lock().unwrap().clone();
    *session.channel.lock().unwrap() = Some(on_event.clone());
    {
        let (lock, cvar) = &*session.pending;
        *lock.lock().unwrap() = 0;
        cvar.notify_one();
    }
    if !snapshot.is_empty() {
        let bytes = snapshot.len() as i64;
        {
            let (lock, _) = &*session.pending;
            *lock.lock().unwrap() += bytes;
        }
        on_event
            .send(PtyEvent::Data { data: snapshot, bytes })
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub fn pty_list(state: State<PtyState>) -> Vec<u32> {
    state
        .0
        .lock()
        .unwrap()
        .iter()
        .filter(|(_, s)| s.alive.load(Ordering::Relaxed))
        .map(|(id, _)| *id)
        .collect()
}

#[tauri::command]
pub fn pty_write(state: State<PtyState>, id: u32, data: String) -> Result<(), String> {
    let mut sessions = state.0.lock().unwrap();
    let session = sessions.get_mut(&id).ok_or("no such pty")?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(state: State<PtyState>, id: u32, cols: u16, rows: u16) -> Result<(), String> {
    let sessions = state.0.lock().unwrap();
    let session = sessions.get(&id).ok_or("no such pty")?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_ack(state: State<PtyState>, id: u32, bytes: i64) {
    if let Some(session) = state.0.lock().unwrap().get(&id) {
        let (lock, cvar) = &*session.pending;
        *lock.lock().unwrap() -= bytes;
        cvar.notify_one();
    }
}

#[cfg(unix)]
fn process_group_leader(state: &State<PtyState>, id: u32) -> Option<u32> {
    let sessions = state.0.lock().unwrap();
    sessions.get(&id)?.master.process_group_leader().map(|p| p as u32)
}

#[tauri::command]
pub fn pty_process(state: State<PtyState>, id: u32) -> Option<String> {
    #[cfg(unix)]
    {
        let pid = process_group_leader(&state, id)?;
        let out = std::process::Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "comm="])
            .output()
            .ok()?;
        let name = String::from_utf8_lossy(&out.stdout)
            .trim()
            .trim_start_matches('-')
            .rsplit('/')
            .next()?
            .to_string();
        if name.is_empty() {
            None
        } else {
            Some(name)
        }
    }
    #[cfg(not(unix))]
    {
        let _ = (state, id);
        None
    }
}

#[tauri::command]
pub fn pty_cwd(state: State<PtyState>, id: u32) -> Option<String> {
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let pid = process_group_leader(&state, id)?;
    #[cfg(target_os = "linux")]
    {
        return std::fs::read_link(format!("/proc/{}/cwd", pid))
            .ok()
            .map(|p| p.to_string_lossy().into_owned());
    }
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("lsof")
            .args(["-a", "-p", &pid.to_string(), "-d", "cwd", "-Fn"])
            .output()
            .ok()?;
        for line in String::from_utf8_lossy(&out.stdout).lines() {
            if let Some(path) = line.strip_prefix('n') {
                return Some(path.to_string());
            }
        }
        None
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos")))]
    {
        let _ = (state, id);
        None
    }
}

#[tauri::command]
pub fn pty_kill(state: State<PtyState>, id: u32) {
    if let Some(mut session) = state.0.lock().unwrap().remove(&id) {
        session.alive.store(false, Ordering::Relaxed);
        let _ = session.killer.kill();
        let (lock, cvar) = &*session.pending;
        *lock.lock().unwrap() = 0;
        cvar.notify_one();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drain_utf8_handles_split_multibyte() {
        let euro = "€".as_bytes();
        let mut buf = b"ab".to_vec();
        buf.extend_from_slice(&euro[..2]);
        assert_eq!(drain_utf8(&mut buf), "ab");
        buf.extend_from_slice(&euro[2..]);
        assert_eq!(drain_utf8(&mut buf), "€");
        assert!(buf.is_empty());

        let mut invalid = vec![b'x', 0xff, b'y'];
        assert_eq!(drain_utf8(&mut invalid), "x\u{fffd}y");
        assert!(invalid.is_empty());
    }

    #[test]
    fn scrollback_trims_on_char_boundary() {
        let store = Mutex::new(String::new());
        push_scrollback(&store, &"a".repeat(SCROLLBACK_CAP));
        push_scrollback(&store, "€bc");
        let s = store.lock().unwrap();
        assert!(s.len() <= SCROLLBACK_CAP);
        assert!(std::str::from_utf8(s.as_bytes()).is_ok());
        assert!(s.ends_with("€bc"));
    }

    #[test]
    fn pty_roundtrip() {
        let pair = native_pty_system()
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();
        let mut cmd = CommandBuilder::new("echo");
        cmd.arg("hello-pty");
        let mut child = pair.slave.spawn_command(cmd).unwrap();
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().unwrap();
        drop(pair.master);
        let mut out = String::new();
        let _ = reader.read_to_string(&mut out);
        child.wait().unwrap();
        assert!(out.contains("hello-pty"));
    }
}
