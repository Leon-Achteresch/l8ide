use serde::Serialize;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const MAX_INPUT: usize = 2_000_000;
const MAX_OUTPUT: usize = 2_000_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolResult {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub timed_out: bool,
}

fn local_executable(root: &Path, tool: &str) -> Result<PathBuf, String> {
    let name = match tool {
        "biome" => "biome",
        "eslint" => "eslint",
        "prettier" => "prettier",
        _ => return Err("Unbekanntes Werkzeug".into()),
    };
    let filename = if cfg!(windows) {
        format!("{name}.cmd")
    } else {
        name.into()
    };
    let binary = root.join("node_modules").join(".bin").join(filename);
    if !binary.is_file() {
        return Err(format!("{tool} ist in diesem Projekt nicht installiert"));
    }
    Ok(binary)
}

#[tauri::command]
pub async fn project_tool(
    root: String,
    path: String,
    content: String,
    tool: String,
    mode: String,
) -> Result<ToolResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if content.len() > MAX_INPUT {
            return Err("Datei ist für die Live-Analyse zu groß".into());
        }
        let root = Path::new(&root).canonicalize().map_err(|e| e.to_string())?;
        let path = Path::new(&path).canonicalize().map_err(|e| e.to_string())?;
        if !path.starts_with(&root) || !path.is_file() {
            return Err("Datei liegt nicht im geöffneten Projekt".into());
        }
        let binary = local_executable(&root, &tool)?;
        let args: Vec<String> = match (tool.as_str(), mode.as_str()) {
            ("biome", "format") => vec![
                "format".into(),
                format!("--stdin-file-path={}", path.display()),
            ],
            ("biome", "lint") => vec![
                "lint".into(),
                path.to_string_lossy().into_owned(),
                "--reporter=rdjson".into(),
                "--max-diagnostics=none".into(),
            ],
            ("eslint", "lint") => vec![
                "--stdin".into(),
                "--stdin-filename".into(),
                path.to_string_lossy().into_owned(),
                "--format".into(),
                "json".into(),
            ],
            ("prettier", "format") => vec![
                "--stdin-filepath".into(),
                path.to_string_lossy().into_owned(),
            ],
            _ => return Err("Werkzeug und Aktion passen nicht zusammen".into()),
        };
        let mut command = if cfg!(windows) {
            let mut cmd = Command::new("cmd");
            cmd.arg("/C").arg(&binary);
            cmd
        } else {
            Command::new(&binary)
        };
        let mut child = command
            .args(args)
            .current_dir(&root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("{tool} konnte nicht gestartet werden: {e}"))?;

        let stdout = child.stdout.take().ok_or("stdout fehlt")?;
        let stderr = child.stderr.take().ok_or("stderr fehlt")?;
        let out = std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = stdout.take((MAX_OUTPUT + 1) as u64).read_to_end(&mut bytes);
            bytes
        });
        let err = std::thread::spawn(move || {
            let mut bytes = Vec::new();
            let _ = stderr.take((MAX_OUTPUT + 1) as u64).read_to_end(&mut bytes);
            bytes
        });
        if let Some(mut stdin) = child.stdin.take() {
            if tool != "biome" || mode == "format" {
                stdin
                    .write_all(content.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
        }
        let start = Instant::now();
        let mut timed_out = false;
        let code = loop {
            match child.try_wait() {
                Ok(Some(status)) => break status.code(),
                Ok(None) if start.elapsed() > Duration::from_secs(20) => {
                    let _ = child.kill();
                    let _ = child.wait();
                    timed_out = true;
                    break None;
                }
                Ok(None) => std::thread::sleep(Duration::from_millis(30)),
                Err(e) => return Err(e.to_string()),
            }
        };
        let out = out.join().unwrap_or_default();
        let err = err.join().unwrap_or_default();
        if out.len() > MAX_OUTPUT || err.len() > MAX_OUTPUT {
            return Err(format!("{tool} hat zu viel Ausgabe erzeugt"));
        }
        Ok(ToolResult {
            code,
            stdout: String::from_utf8_lossy(&out).into_owned(),
            stderr: String::from_utf8_lossy(&err).into_owned(),
            timed_out,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
