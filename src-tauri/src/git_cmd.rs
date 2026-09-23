use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub(crate) fn git_command(repo: Option<&Path>) -> Command {
    let mut cmd = if cfg!(windows) {
        if let Some(wsl) = repo.and_then(crate::wsl::parse_path) {
            let mut cmd = crate::wsl::command(&wsl.distribution);
            cmd.args(["--exec", "git", "-C", &wsl.linux_path]);
            cmd
        } else {
            let mut cmd = Command::new("git");
            if let Some(repo) = repo {
                cmd.arg("-C").arg(repo);
            }
            cmd
        }
    } else {
        let mut cmd = Command::new("git");
        if let Some(repo) = repo {
            cmd.arg("-C").arg(repo);
        }
        cmd
    };
    apply_no_window(&mut cmd);
    cmd
}

pub(crate) fn apply_no_window(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = cmd;
    }
}
