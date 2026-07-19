import { invoke } from "@tauri-apps/api/core";
import type * as monacoNs from "monaco-editor";
import { parseDiffRanges, type GutterRange } from "@/lib/git-diff-parse";
import { useWorkspaceStore } from "@/lib/workspace-store";

type FileDiffResponse = {
  staged: string | null;
  unstaged: string | null;
  untracked_plain: string | null;
  is_binary: boolean;
};

const KIND_LABEL = {
  add: "Hinzugefügt",
  modify: "Geändert",
  delete: "Entfernt",
} as const;

function revertRange(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  r: GutterRange,
) {
  const model = editor.getModel();
  if (!model) return;
  const lineCount = model.getLineCount();
  let range: monacoNs.Range;
  let text: string;
  if (r.kind === "add") {
    if (r.end < lineCount) {
      range = new monaco.Range(r.start, 1, r.end + 1, 1);
    } else {
      range = new monaco.Range(
        Math.max(1, r.start - 1),
        r.start > 1 ? model.getLineMaxColumn(r.start - 1) : 1,
        r.end,
        model.getLineMaxColumn(r.end),
      );
    }
    text = "";
  } else if (r.kind === "modify") {
    range = new monaco.Range(r.start, 1, r.end, model.getLineMaxColumn(r.end));
    text = r.oldLines.join("\n");
  } else {
    if (r.start > lineCount) {
      range = new monaco.Range(
        lineCount,
        model.getLineMaxColumn(lineCount),
        lineCount,
        model.getLineMaxColumn(lineCount),
      );
      text = `\n${r.oldLines.join("\n")}`;
    } else {
      range = new monaco.Range(r.start, 1, r.start, 1);
      text = `${r.oldLines.join("\n")}\n`;
    }
  }
  editor.executeEdits("git-gutter-revert", [{ range, text }]);
}

export function attachGitGutter(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);
  let cancelled = false;
  let ranges: GutterRange[] = [];
  let peek: monacoNs.editor.IContentWidget | null = null;

  function closePeek() {
    if (peek) {
      editor.removeContentWidget(peek);
      peek = null;
    }
  }

  function showPeek(r: GutterRange) {
    closePeek();
    const node = document.createElement("div");
    node.className =
      "overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10";
    node.style.width = "min(560px, 60vw)";

    const header = document.createElement("div");
    header.className =
      "flex h-7 items-center gap-2 bg-foreground/[0.04] px-2.5 text-[11px]";
    const title = document.createElement("span");
    title.className = "font-medium";
    title.textContent = KIND_LABEL[r.kind];
    const spacer = document.createElement("span");
    spacer.className = "flex-1";
    const revertBtn = document.createElement("button");
    revertBtn.type = "button";
    revertBtn.textContent = "Zurücksetzen";
    revertBtn.className =
      "rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-red-500";
    revertBtn.onclick = () => {
      revertRange(editor, monaco, r);
      closePeek();
    };
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.className =
      "rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground";
    closeBtn.onclick = closePeek;
    header.append(title, spacer, revertBtn, closeBtn);
    node.append(header);

    if (r.oldLines.length > 0) {
      const pre = document.createElement("pre");
      pre.className =
        "max-h-40 overflow-auto px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground";
      pre.textContent = r.oldLines.join("\n");
      node.append(pre);
    }

    peek = {
      getId: () => "git-gutter-peek",
      getDomNode: () => node,
      allowEditorOverflow: true,
      getPosition: () => ({
        position: { lineNumber: r.start, column: 1 },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
        ],
      }),
    };
    editor.addContentWidget(peek);
  }

  const mouseSub = editor.onMouseDown((e) => {
    const t = e.target;
    if (
      t.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS &&
      (t.element?.className ?? "").includes("git-gutter")
    ) {
      const line = t.position?.lineNumber;
      const hit = line != null
        ? ranges.find((r) => line >= r.start && line <= r.end)
        : undefined;
      if (hit) {
        showPeek(hit);
        return;
      }
    }
    if (peek && !(e.event.target as HTMLElement)?.closest?.("[widgetid=git-gutter-peek]")) {
      closePeek();
    }
  });
  const contentSub = editor.onDidChangeModelContent(closePeek);

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
    ranges = parseDiffRanges(diff.unstaged ?? "");
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
      closePeek();
      mouseSub.dispose();
      contentSub.dispose();
      collection.clear();
    },
  };
}
