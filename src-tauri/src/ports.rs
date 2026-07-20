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

#[tauri::command]
pub async fn list_dev_ports() -> Result<Vec<ListeningPort>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let out = Command::new("lsof")
            .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
            .output()
            .map_err(|e| format!("lsof fehlgeschlagen: {e}"))?;
        let text = String::from_utf8_lossy(&out.stdout);
        let mut by_port: BTreeMap<u16, (String, u32)> = BTreeMap::new();
        for line in text.lines().skip(1) {
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
            let Some(port) = name
                .rsplit(':')
                .next()
                .and_then(|p| p.parse::<u16>().ok())
            else {
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

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .status()
            .map_err(|e| format!("kill fehlgeschlagen: {e}"))?;
        Ok(())
    })
    .await
    .map_err(|e| format!("Task fehlgeschlagen: {e}"))?
}
