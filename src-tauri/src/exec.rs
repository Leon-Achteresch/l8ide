use serde::Serialize;
use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Serialize)]
pub struct ShellResult {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
}

const MAX_OUTPUT: usize = 100_000;

fn capped(mut s: String) -> String {
    if s.len() > MAX_OUTPUT {
        let mut boundary = MAX_OUTPUT;
        while !s.is_char_boundary(boundary) {
            boundary -= 1;
        }
        s.truncate(boundary);
        s.push_str("\n… [gekürzt]");
    }
    s
}

#[tauri::command]
pub async fn run_shell(
    cwd: String,
    command: String,
    timeout_ms: Option<u64>,
) -> Result<ShellResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let timeout = Duration::from_millis(timeout_ms.unwrap_or(60_000).min(300_000));
        let mut runner = if let Some(path) =
            crate::wsl::parse_path(std::path::Path::new(&cwd)).filter(|_| cfg!(windows))
        {
            let mut cmd = crate::wsl::command_at(&path);
            cmd.args(["sh", "-lc", &command]);
            cmd
        } else {
            let mut cmd = Command::new("sh");
            cmd.args(["-lc", &command]).current_dir(&cwd);
            cmd
        };
        let mut child = runner
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Start fehlgeschlagen: {e}"))?;

        let mut stdout_pipe = child.stdout.take();
        let mut stderr_pipe = child.stderr.take();
        let out_handle = std::thread::spawn(move || {
            let mut buf = String::new();
            if let Some(p) = stdout_pipe.as_mut() {
                let _ = p.read_to_string(&mut buf);
            }
            buf
        });
        let err_handle = std::thread::spawn(move || {
            let mut buf = String::new();
            if let Some(p) = stderr_pipe.as_mut() {
                let _ = p.read_to_string(&mut buf);
            }
            buf
        });

        let start = Instant::now();
        let mut timed_out = false;
        let code = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status.code(),
                Ok(None) => {
                    if start.elapsed() > timeout {
                        let _ = child.kill();
                        let _ = child.wait();
                        timed_out = true;
                        break None;
                    }
                    std::thread::sleep(Duration::from_millis(100));
                }
                Err(e) => return Err(format!("Warten fehlgeschlagen: {e}")),
            }
        };

        let stdout = capped(out_handle.join().unwrap_or_default());
        let stderr = capped(err_handle.join().unwrap_or_default());
        Ok(ShellResult {
            code,
            stdout,
            stderr,
            timed_out,
        })
    })
    .await
    .map_err(|e| format!("Task fehlgeschlagen: {e}"))?
}
