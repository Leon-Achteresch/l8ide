import { invoke } from "@tauri-apps/api/core";
import type * as monacoNs from "monaco-editor";
import { parseDiffRanges } from "@/lib/git-diff-parse";
import { useWorkspaceStore } from "@/lib/workspace-store";

type FileDiffResponse = {
  staged: string | null;
  unstaged: string | null;
  untracked_plain: string | null;
  is_binary: boolean;
};

export function attachGitGutter(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);
  let cancelled = false;

  async function refresh() {
    const root = useWorkspaceStore.getState().rootPath;
    if (!root || !absPath.startsWith(root)) {
      collection.clear();
      return;
    }
    const rel = absPath.slice(root.length).replace(/^\//, "");
    let diff: FileDiffResponse;
    try {
      diff = await invoke<FileDiffResponse>("repo_file_diff", {
        path: root,
        file: rel,
        untracked: false,
      });
    } catch {
      collection.clear();
      return;
    }
    if (cancelled) return;
    const ranges = parseDiffRanges(diff.unstaged ?? "");
    collection.set(
      ranges.map((r) => ({
        range: new monaco.Range(r.start, 1, r.end, 1),
        options: {
          linesDecorationsClassName: `git-gutter git-gutter-${r.kind}`,
        },
      })),
    );
  }

  void refresh();
  return {
    refresh,
    dispose: () => {
      cancelled = true;
      collection.clear();
    },
  };
}
