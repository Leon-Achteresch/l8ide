mod browser;
mod console_sink;
mod exec;
mod favicon;
mod ports;
mod project_tools;
pub mod git;
mod git_cmd;
mod terminal;
mod wsl;

use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use grep::matcher::Matcher;
use grep::regex::RegexMatcherBuilder;
use grep::searcher::sinks::UTF8;
use grep::searcher::{BinaryDetection, SearcherBuilder};
use ignore::overrides::OverrideBuilder;
use ignore::{WalkBuilder, WalkState};
use serde::{Deserialize, Serialize};

const MAX_TOTAL_MATCHES: usize = 2000;
const MAX_FILE_MATCHES: usize = 200;
const MAX_LINE_MATCHES: usize = 50;
const MAX_PREVIEW_CHARS: usize = 500;

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SearchOptions {
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    regex: bool,
    include: String,
    exclude: String,
    #[serde(default)]
    no_ignore: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchMatch {
    line: u64,
    column: usize,
    length: usize,
    preview: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileMatches {
    path: String,
    matches: Vec<SearchMatch>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResponse {
    files: Vec<FileMatches>,
    total: usize,
    truncated: bool,
}

fn pattern_for(options: &SearchOptions) -> String {
    let base = if options.regex {
        options.query.clone()
    } else {
        regex::escape(&options.query)
    };
    if options.whole_word {
        format!(r"\b(?:{})\b", base)
    } else {
        base
    }
}

fn build_overrides(
    root: &str,
    options: &SearchOptions,
) -> Result<ignore::overrides::Override, String> {
    let mut builder = OverrideBuilder::new(root);
    for glob in options
        .include
        .split(',')
        .map(str::trim)
        .filter(|g| !g.is_empty())
    {
        builder.add(glob).map_err(|e| e.to_string())?;
    }
    for glob in options
        .exclude
        .split(',')
        .map(str::trim)
        .filter(|g| !g.is_empty())
    {
        builder
            .add(&format!("!{}", glob))
            .map_err(|e| e.to_string())?;
    }
    builder.add("!.git").map_err(|e| e.to_string())?;
    builder.build().map_err(|e| e.to_string())
}

#[tauri::command]
fn search_in_files(root: String, options: SearchOptions) -> Result<SearchResponse, String> {
    if options.query.is_empty() {
        return Ok(SearchResponse {
            files: Vec::new(),
            total: 0,
            truncated: false,
        });
    }
    let matcher = RegexMatcherBuilder::new()
        .case_insensitive(!options.case_sensitive)
        .build(&pattern_for(&options))
        .map_err(|e| e.to_string())?;
    let overrides = build_overrides(&root, &options)?;

    let results = Mutex::new(Vec::<FileMatches>::new());
    let total = AtomicUsize::new(0);

    WalkBuilder::new(&root)
        .hidden(false)
        .git_ignore(!options.no_ignore)
        .git_global(!options.no_ignore)
        .git_exclude(!options.no_ignore)
        .overrides(overrides)
        .build_parallel()
        .run(|| {
            let matcher = &matcher;
            let results = &results;
            let total = &total;
            let mut searcher = SearcherBuilder::new()
                .binary_detection(BinaryDetection::quit(0))
                .build();
            Box::new(move |entry| {
                if total.load(Ordering::Relaxed) >= MAX_TOTAL_MATCHES {
                    return WalkState::Quit;
                }
                let Ok(entry) = entry else {
                    return WalkState::Continue;
                };
                if !entry.file_type().is_some_and(|t| t.is_file()) {
                    return WalkState::Continue;
                }
                let mut matches = Vec::<SearchMatch>::new();
                let _ = searcher.search_path(
                    matcher,
                    entry.path(),
                    UTF8(|line_number, line| {
                        if matches.len() >= MAX_FILE_MATCHES {
                            return Ok(false);
                        }
                        let text = line.trim_end_matches(['\n', '\r']);
                        let mut spans = Vec::new();
                        let _ = matcher.find_iter(text.as_bytes(), |m| {
                            spans.push((m.start(), m.end()));
                            spans.len() < MAX_LINE_MATCHES
                        });
                        if spans.is_empty() {
                            return Ok(true);
                        }
                        let preview: String = text.chars().take(MAX_PREVIEW_CHARS).collect();
                        for (start, end) in spans {
                            if matches.len() >= MAX_FILE_MATCHES {
                                break;
                            }
                            matches.push(SearchMatch {
                                line: line_number,
                                column: text[..start].chars().count(),
                                length: text[start..end].chars().count().max(1),
                                preview: preview.clone(),
                            });
                        }
                        Ok(true)
                    }),
                );
                if !matches.is_empty() {
                    total.fetch_add(matches.len(), Ordering::Relaxed);
                    results.lock().unwrap().push(FileMatches {
                        path: entry.path().to_string_lossy().replace('\\', "/"),
                        matches,
                    });
                }
                WalkState::Continue
            })
        });

    let mut files = results.into_inner().unwrap();
    files.sort_by(|a, b| a.path.cmp(&b.path));
    let total: usize = files.iter().map(|f| f.matches.len()).sum();
    Ok(SearchResponse {
        files,
        total,
        truncated: total >= MAX_TOTAL_MATCHES,
    })
}

fn build_regex(options: &SearchOptions) -> Result<regex::Regex, String> {
    regex::RegexBuilder::new(&pattern_for(options))
        .case_insensitive(!options.case_sensitive)
        .multi_line(true)
        .build()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn replace_in_files(
    paths: Vec<String>,
    options: SearchOptions,
    replacement: String,
) -> Result<Vec<String>, String> {
    let re = build_regex(&options)?;
    let mut changed = Vec::new();
    for path in paths {
        let Ok(content) = std::fs::read_to_string(&path) else {
            continue;
        };
        let replaced = if options.regex {
            re.replace_all(&content, replacement.as_str())
        } else {
            re.replace_all(&content, regex::NoExpand(&replacement))
        };
        if replaced != content {
            std::fs::write(&path, replaced.as_bytes()).map_err(|e| e.to_string())?;
            changed.push(path);
        }
    }
    Ok(changed)
}

fn char_to_byte(text: &str, chars: usize) -> usize {
    text.char_indices()
        .nth(chars)
        .map(|(i, _)| i)
        .unwrap_or(text.len())
}

#[tauri::command]
fn replace_match(
    path: String,
    options: SearchOptions,
    replacement: String,
    line: u64,
    column: usize,
) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let re = build_regex(&options)?;
    let mut offset = 0usize;
    for (i, segment) in content.split_inclusive('\n').enumerate() {
        if (i as u64) + 1 == line {
            let body = segment.trim_end_matches(['\n', '\r']);
            let target = offset + char_to_byte(body, column);
            let caps = re
                .captures_at(&content, target)
                .filter(|c| c.get(0).is_some_and(|m| m.start() == target))
                .ok_or("Treffer nicht mehr vorhanden")?;
            let m = caps.get(0).unwrap();
            let mut expanded = String::new();
            if options.regex {
                caps.expand(&replacement, &mut expanded);
            } else {
                expanded = replacement;
            }
            let new_content = format!("{}{}{}", &content[..m.start()], expanded, &content[m.end()..]);
            std::fs::write(&path, new_content).map_err(|e| e.to_string())?;
            return Ok(());
        }
        offset += segment.len();
    }
    Err("Treffer nicht mehr vorhanden".into())
}

#[tauri::command]
fn list_files(root: String, hidden: Vec<String>) -> Vec<String> {
    let hidden: std::collections::HashSet<String> = hidden.into_iter().collect();
    let results = Mutex::new(Vec::<String>::new());

    WalkBuilder::new(&root)
        .hidden(false)
        .filter_entry(move |entry| {
            let name = entry.file_name().to_string_lossy();
            name != ".git" && name != "node_modules" && !hidden.contains(name.as_ref())
        })
        .build_parallel()
        .run(|| {
            let results = &results;
            Box::new(move |entry| {
                let Ok(entry) = entry else {
                    return WalkState::Continue;
                };
                if entry.file_type().is_some_and(|t| t.is_file()) {
                    let path = entry.path().to_string_lossy().replace('\\', "/");
                    results.lock().unwrap().push(path);
                }
                WalkState::Continue
            })
        });

    let mut files = results.into_inner().unwrap();
    files.sort();
    files
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_in_l8git(repo: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut cmd = {
        let mut c = std::process::Command::new("open");
        c.args(["-a", "l8git", &repo]);
        c
    };
    #[cfg(not(target_os = "macos"))]
    let mut cmd = {
        let mut c = std::process::Command::new("l8git");
        c.arg(&repo);
        c
    };
    cmd.spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(query: &str, regex: bool, whole_word: bool, case_sensitive: bool) -> SearchOptions {
        SearchOptions {
            query: query.into(),
            case_sensitive,
            whole_word,
            regex,
            include: String::new(),
            exclude: String::new(),
            no_ignore: false,
        }
    }

    #[test]
    fn list_files_skips_hidden_and_ignored() {
        let dir = std::env::temp_dir().join("l8ide-list-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("src")).unwrap();
        std::fs::create_dir_all(dir.join("node_modules/pkg")).unwrap();
        std::fs::create_dir_all(dir.join("secret")).unwrap();
        std::fs::write(dir.join("src/a.ts"), "a").unwrap();
        std::fs::write(dir.join(".env"), "x").unwrap();
        std::fs::write(dir.join("node_modules/pkg/b.js"), "b").unwrap();
        std::fs::write(dir.join("secret/c.txt"), "c").unwrap();

        let root = dir.to_string_lossy().into_owned();
        let files = list_files(root.clone(), vec!["secret".into()]);
        let names: Vec<&str> = files
            .iter()
            .map(|f| f.rsplit('/').next().unwrap())
            .collect();
        assert!(names.contains(&"a.ts"));
        assert!(names.contains(&".env"));
        assert!(!names.iter().any(|n| *n == "b.js" || *n == "c.txt"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn search_and_replace_roundtrip() {
        let dir = std::env::temp_dir().join("l8ide-search-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("a.txt");
        std::fs::write(&file, "foo bar\nfoobar Foo\nbar\n").unwrap();
        let root = dir.to_string_lossy().into_owned();
        let path = file.to_string_lossy().into_owned();

        let res = search_in_files(root.clone(), opts("foo", false, false, false)).unwrap();
        assert_eq!(res.total, 3);

        let res = search_in_files(root.clone(), opts("foo", false, true, true)).unwrap();
        assert_eq!(res.total, 1);
        let m = &res.files[0].matches[0];
        assert_eq!((m.line, m.column, m.length), (1, 0, 3));

        replace_match(path.clone(), opts("foo", false, false, false), "qux".into(), 2, 0)
            .unwrap();
        assert_eq!(
            std::fs::read_to_string(&file).unwrap(),
            "foo bar\nquxbar Foo\nbar\n"
        );

        let changed = replace_in_files(
            vec![path.clone()],
            opts(r"(b)ar", true, false, false),
            "${1}az".into(),
        )
        .unwrap();
        assert_eq!(changed, vec![path]);
        assert_eq!(
            std::fs::read_to_string(&file).unwrap(),
            "foo baz\nquxbaz Foo\nbaz\n"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(terminal::PtyState::default())
        .setup(|app| {
            if let Some(port) = console_sink::start(app.handle().clone()) {
                browser::set_console_port(port);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            list_files,
            search_in_files,
            replace_in_files,
            replace_match,
            open_in_l8git,
            git::repo_full_status,
            git::repo_status,
            git::repo_staged_diff,
            git::repo_blame,
            git::git_reflog,
            git::git_reset,
            git::list_submodules,
            git::git_submodule_update,
            git::git_submodule_init,
            git::git_submodule_sync,
            git::git_submodule_deinit,
            git::repo_language_stats,
            git::repo_contributor_stats,
            git::repo_activity_buckets,
            git::repo_log_page,
            git::repo_range_log,
            git::git_revert_commit,
            git::git_cherry_pick,
            git::list_tags,
            git::git_tag_commit,
            git::delete_tag,
            git::list_git_remotes,
            git::add_git_remote,
            git::set_git_remote_url,
            git::list_stashes,
            git::git_stash_push,
            git::git_stash_pop,
            git::git_stash_apply,
            git::git_stash_drop,
            git::list_worktrees,
            git::git_worktree_add,
            git::git_worktree_remove,
            git::repo_file_diff,
            git::repo_file_content_at,
            git::git_current_branch,
            git::stage_files,
            git::unstage_files,
            git::commit_changes,
            git::commit_amend,
            git::git_checkout,
            git::git_create_branch,
            git::delete_branch,
            git::git_fetch,
            git::git_pull,
            git::git_push,
            git::open_repo,
            git::git_discard_files,
            git::git_file_log,
            git::git_get_conflict_versions,
            git::git_save_resolved_file,
            git::git_merge_commit,
            git::git_merge_abort,
            terminal::pty_spawn,
            terminal::pty_reconnect,
            terminal::pty_list,
            terminal::pty_write,
            terminal::pty_resize,
            terminal::pty_ack,
            terminal::pty_process,
            terminal::pty_cwd,
            terminal::pty_profiles,
            terminal::pty_kill,
            wsl::wsl_status,
            wsl::wsl_home,
            wsl::wsl_open_folder,
            browser::browser_open,
            browser::browser_set_bounds,
            browser::browser_show,
            browser::browser_navigate,
            exec::run_shell,
            project_tools::project_tool,
            ports::list_dev_ports,
            ports::kill_process,
            browser::browser_eval,
            browser::browser_devtools,
            browser::browser_close,
            favicon::read_repo_favicon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
