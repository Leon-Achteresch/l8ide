use serde::Serialize;
use std::collections::BTreeMap;
use std::process::Command;

#[derive(Serialize)]
pub struct ListeningPort {
    pub port: u16,
    pub process: String,
    pub pid: u32,
}

const DEV_PROCESSES: [&str; 8] = [
    "node", "bun", "deno", "vite", "next", "python", "php", "ruby",
];

fn parse_ss_line(line: &str) -> Option<(u16, String, u32)> {
    // ss -ltnpH: LISTEN 0 511 127.0.0.1:3000 0.0.0.0:* users:(("node",pid=42,fd=19))
    let fields: Vec<&str> = line.split_whitespace().collect();
    let port = fields.get(3)?.rsplit(':').next()?.parse::<u16>().ok()?;
    let users = line.split("users:((\"").nth(1)?;
    let (name, detail) = users.split_once('"')?;
    let pid = detail
        .split("pid=")
        .nth(1)?
        .split(|c: char| !c.is_ascii_digit())
        .next()?
        .parse::<u32>()
        .ok()?;
    let name = name.to_lowercase();
    (port >= 1024 && DEV_PROCESSES.iter().any(|p| name.starts_with(p))).then_some((port, name, pid))
}

#[tauri::command]
pub async fn list_dev_ports(cwd: Option<String>) -> Result<Vec<ListeningPort>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let wsl = cwd
            .as_deref()
            .and_then(|p| crate::wsl::parse_path(std::path::Path::new(p)))
            .filter(|_| cfg!(windows));
        let out = if let Some(path) = &wsl {
            crate::wsl::command(&path.distribution)
                .args(["--exec", "ss", "-ltnpH"])
                .output()
        } else {
            Command::new("lsof")
                .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
                .output()
        }
        .map_err(|e| format!("Port-Abfrage fehlgeschlagen: {e}"))?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
        }
        let text = String::from_utf8_lossy(&out.stdout);
        let mut by_port: BTreeMap<u16, (String, u32)> = BTreeMap::new();
        for line in text.lines().skip(if wsl.is_some() { 0 } else { 1 }) {
            if wsl.is_some() {
                if let Some((port, name, pid)) = parse_ss_line(line) {
                    by_port.entry(port).or_insert((name, pid));
                }
                continue;
            }
            let fields: Vec<&str> = line.split_whitespace().collect();
            let name_index = if fields.last() == Some(&"(LISTEN)") {
                fields.len().checked_sub(2)
            } else {
                fields.len().checked_sub(1)
            };
            let (Some(command), Some(pid_str), Some(name)) = (
                fields.first(),
                fields.get(1),
                name_index.and_then(|i| fields.get(i)),
            ) else {
                continue;
            };
            let lower = command.to_lowercase();
            if !DEV_PROCESSES.iter().any(|p| lower.starts_with(p)) {
                continue;
            }
            let Ok(pid) = pid_str.parse::<u32>() else {
                continue;
            };
            let Some(port) = name.rsplit(':').next().and_then(|p| p.parse::<u16>().ok()) else {
                continue;
            };
            if port < 1024 {
                continue;
            }
            by_port.entry(port).or_insert_with(|| (lower.clone(), pid));
        }
        Ok(by_port
            .into_iter()
            .map(|(port, (process, pid))| ListeningPort { port, process, pid })
            .collect())
    })
    .await
    .map_err(|e| format!("Task fehlgeschlagen: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::parse_ss_line;

    #[test]
    fn parses_wsl_listening_processes() {
        assert_eq!(
            parse_ss_line("LISTEN 0 511 127.0.0.1:3000 0.0.0.0:* users:((\"node\",pid=42,fd=19))"),
            Some((3000, "node".into(), 42))
        );
        assert_eq!(
            parse_ss_line("LISTEN 0 128 *:8080 *:* users:((\"ssh\",pid=10,fd=3))"),
            None
        );
    }
}

#[tauri::command]
pub async fn kill_process(pid: u32, cwd: Option<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let wsl = cwd
            .as_deref()
            .and_then(|p| crate::wsl::parse_path(std::path::Path::new(p)))
            .filter(|_| cfg!(windows));
        let status = if let Some(path) = wsl {
            crate::wsl::command(&path.distribution)
                .args(["--exec", "kill", "-TERM", &pid.to_string()])
                .status()
        } else {
            Command::new("kill")
                .arg("-TERM")
                .arg(pid.to_string())
                .status()
        }
        .map_err(|e| format!("kill fehlgeschlagen: {e}"))?;
        if !status.success() {
            return Err("Prozess konnte nicht beendet werden".into());
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task fehlgeschlagen: {e}"))?
}
