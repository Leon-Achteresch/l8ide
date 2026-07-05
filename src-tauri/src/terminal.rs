use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::State;

const HIGH_WATER: i64 = 1024 * 1024;
const READ_BUF: usize = 64 * 1024;

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

fn default_shell() -> CommandBuilder {
    if cfg!(windows) {
        CommandBuilder::new("powershell.exe")
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".into());
        let mut cmd = CommandBuilder::new(shell);
        cmd.arg("-l");
        cmd
    }
}

#[tauri::command]
pub fn pty_spawn(
    state: State<PtyState>,
    cwd: Option<String>,
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

    let mut cmd = default_shell();
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
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

    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    state.0.lock().unwrap().insert(
        id,
        Session {
            writer,
            master: pair.master,
            killer,
            pending: pending.clone(),
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
                    let bytes = data.len() as i64;
                    if on_event.send(PtyEvent::Data { data, bytes }).is_err() {
                        break;
                    }
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
        let _ = child.wait();
        let _ = on_event.send(PtyEvent::Exit);
    });

    Ok(id)
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

#[tauri::command]
pub fn pty_kill(state: State<PtyState>, id: u32) {
    if let Some(mut session) = state.0.lock().unwrap().remove(&id) {
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
