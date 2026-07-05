import { invoke } from "@tauri-apps/api/core";
import type * as monacoNs from "monaco-editor";
import { useWorkspaceStore } from "@/lib/workspace-store";

type FileDiffResponse = {
  staged: string | null;
  unstaged: string | null;
  untracked_plain: string | null;
  is_binary: boolean;
};

type GutterKind = "add" | "modify" | "delete";
type GutterRange = { start: number; end: number; kind: GutterKind };

function parseDiffRanges(diff: string): GutterRange[] {
  const ranges: GutterRange[] = [];
  let newLine = 0;
  let addStart = 0;
  let addCount = 0;
  let delCount = 0;

  function flush() {
    if (addCount === 0 && delCount === 0) return;
    if (addCount === 0) {
      const line = Math.max(1, newLine);
      ranges.push({ start: line, end: line, kind: "delete" });
    } else {
      ranges.push({
        start: addStart,
        end: addStart + addCount - 1,
        kind: delCount > 0 ? "modify" : "add",
      });
    }
    addCount = 0;
    delCount = 0;
  }

  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) {
      flush();
      const m = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      newLine = m ? parseInt(m[1], 10) : 1;
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) {
      if (addCount === 0) addStart = newLine;
      addCount++;
      newLine++;
    } else if (line.startsWith("-")) {
      delCount++;
    } else {
      flush();
      newLine++;
    }
  }
  flush();
  return ranges;
}

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
