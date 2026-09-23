use serde::Serialize;
use std::path::Path;
use std::process::Command;

use crate::git_cmd::apply_no_window;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WslPath {
    pub distribution: String,
    pub linux_path: String,
}

/// The UI uses forward slashes so its existing path joins also work for UNC paths.
pub fn parse_path(path: &Path) -> Option<WslPath> {
    let raw = path.to_str()?.replace('\\', "/");
    let prefix_len = if raw
        .get(..16)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("//wsl.localhost/"))
    {
        16
    } else if raw
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("//wsl$/"))
    {
        7
    } else {
        return None;
    };
    let rest = &raw[prefix_len..];
    let (distribution, tail) = rest.split_once('/').unwrap_or((rest, ""));
    if distribution.is_empty() || distribution == "." || distribution == ".." {
        return None;
    }
    let mut parts = Vec::new();
    for part in tail.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            parts.pop()?;
        } else {
            parts.push(part);
        }
    }
    Some(WslPath {
        distribution: distribution.to_string(),
        linux_path: format!("/{}", parts.join("/")),
    })
}

pub fn to_windows_path(distribution: &str, linux_path: &str) -> String {
    format!(
        "//wsl.localhost/{distribution}{}",
        if linux_path.starts_with('/') {
            linux_path.to_string()
        } else {
            format!("/{linux_path}")
        }
    )
}

pub fn host_path(repo: &Path, path: &str) -> std::path::PathBuf {
    if cfg!(windows) && path.starts_with('/') {
        if let Some(wsl) = parse_path(repo) {
            return to_windows_path(&wsl.distribution, path).into();
        }
    }
    if Path::new(path).is_absolute() {
        path.into()
    } else {
        repo.join(path)
    }
}

pub fn git_arg(repo: &Path, arg: &str) -> String {
    if let (Some(root), Some(value)) = (parse_path(repo), parse_path(Path::new(arg))) {
        if root.distribution == value.distribution {
            return value.linux_path;
        }
    }
    arg.to_string()
}

pub fn command(distribution: &str) -> Command {
    let mut cmd = Command::new("wsl.exe");
    apply_no_window(&mut cmd);
    cmd.arg("--distribution").arg(distribution);
    cmd
}

pub fn command_at(path: &WslPath) -> Command {
    let mut cmd = command(&path.distribution);
    cmd.arg("--cd").arg(&path.linux_path).arg("--exec");
    cmd
}

fn decode_output(bytes: &[u8]) -> String {
    // wsl.exe --list is UTF-16LE on some Windows builds even when stdout is piped.
    let text = if bytes.len() >= 2 && (bytes.starts_with(&[0xff, 0xfe]) || bytes[1] == 0) {
        String::from_utf16_lossy(
            &bytes
                .chunks_exact(2)
                .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                .collect::<Vec<_>>(),
        )
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    };
    text.trim_start_matches('\u{feff}')
        .replace('\r', "")
        .replace('\0', "")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WslStatus {
    pub available: bool,
    pub distributions: Vec<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn wsl_status() -> Result<WslStatus, String> {
    tauri::async_runtime::spawn_blocking(status_sync)
        .await
        .map_err(|e| e.to_string())
}

pub fn status_sync() -> WslStatus {
    if !cfg!(windows) {
        return WslStatus {
            available: false,
            distributions: vec![],
            error: None,
        };
    }
    let mut cmd = Command::new("wsl.exe");
    apply_no_window(&mut cmd);
    match cmd.args(["--list", "--quiet"]).output() {
        Ok(out) if out.status.success() => WslStatus {
            available: true,
            distributions: decode_output(&out.stdout)
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty())
                .map(str::to_string)
                .collect(),
            error: None,
        },
        Ok(out) => WslStatus {
            available: false,
            distributions: vec![],
            error: Some(decode_output(&out.stderr).trim().to_string()),
        },
        Err(err) => WslStatus {
            available: false,
            distributions: vec![],
            error: Some(err.to_string()),
        },
    }
}

#[tauri::command]
pub async fn wsl_home(distribution: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || home_sync(&distribution))
        .await
        .map_err(|e| e.to_string())?
}

fn home_sync(distribution: &str) -> Result<String, String> {
    check_distribution(&distribution)?;
    let out = command(&distribution)
        .args(["--exec", "sh", "-c", "printf '%s' \"$HOME\""])
        .output()
        .map_err(|e| format!("WSL konnte nicht gestartet werden: {e}"))?;
    if !out.status.success() {
        return Err(decode_output(&out.stderr).trim().to_string());
    }
    let home = decode_output(&out.stdout).trim().to_string();
    if !home.starts_with('/') {
        return Err("WSL hat kein gültiges Home-Verzeichnis geliefert".into());
    }
    Ok(home)
}

#[tauri::command]
pub async fn wsl_open_folder(distribution: String, linux_path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || open_folder_sync(&distribution, &linux_path))
        .await
        .map_err(|e| e.to_string())?
}

fn open_folder_sync(distribution: &str, linux_path: &str) -> Result<String, String> {
    check_distribution(&distribution)?;
    if !linux_path.starts_with('/') || linux_path.contains('\0') {
        return Err("Bitte einen absoluten Linux-Pfad eingeben".into());
    }
    let out = command(&distribution)
        .args(["--exec", "test", "-d", &linux_path])
        .output()
        .map_err(|e| format!("WSL konnte nicht gestartet werden: {e}"))?;
    if !out.status.success() {
        return Err(format!(
            "Verzeichnis existiert nicht in {distribution}: {linux_path}"
        ));
    }
    let normalized = linux_path.trim_end_matches('/');
    let path = to_windows_path(
        &distribution,
        if normalized.is_empty() {
            "/"
        } else {
            normalized
        },
    );
    // Start of the distribution above also makes the UNC share available.
    if !Path::new(&path).is_dir() {
        return Err(format!(
            "Windows kann das WSL-Verzeichnis nicht öffnen: {path}"
        ));
    }
    Ok(path)
}

fn check_distribution(distribution: &str) -> Result<(), String> {
    if status_sync()
        .distributions
        .iter()
        .any(|d| d == distribution)
    {
        Ok(())
    } else {
        Err(format!("WSL-Distribution nicht verfügbar: {distribution}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_wsl_unc_paths() {
        assert_eq!(
            parse_path(Path::new("//wsl.localhost/Ubuntu/home/me/work")),
            Some(WslPath {
                distribution: "Ubuntu".into(),
                linux_path: "/home/me/work".into()
            })
        );
        assert_eq!(
            parse_path(Path::new(r"\\wsl$\Debian\home\me")),
            Some(WslPath {
                distribution: "Debian".into(),
                linux_path: "/home/me".into()
            })
        );
        assert_eq!(
            parse_path(Path::new("//WSL$/U")),
            Some(WslPath {
                distribution: "U".into(),
                linux_path: "/".into()
            })
        );
        assert_eq!(parse_path(Path::new("C:/work")), None);
        assert_eq!(
            parse_path(Path::new("//wsl.localhost/Ubuntu/../../etc")),
            None
        );
    }

    #[test]
    fn decodes_utf16_distribution_names() {
        let bytes: Vec<u8> = "Ubuntu\r\nDebian\r\n"
            .encode_utf16()
            .flat_map(u16::to_le_bytes)
            .collect();
        assert_eq!(decode_output(&bytes), "Ubuntu\nDebian\n");
    }

    #[test]
    fn translates_git_paths_only_within_the_same_distribution() {
        let repo = Path::new("//wsl.localhost/Ubuntu/home/me/repo");
        assert_eq!(
            git_arg(repo, "//wsl.localhost/Ubuntu/home/me/other"),
            "/home/me/other"
        );
        assert_eq!(
            git_arg(repo, "//wsl.localhost/Debian/home/me/other"),
            "//wsl.localhost/Debian/home/me/other"
        );
        assert_eq!(git_arg(repo, "src/main.rs"), "src/main.rs");
    }
}
