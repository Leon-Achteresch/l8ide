import { invoke } from "@tauri-apps/api/core";
import type * as monacoNs from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

type BlameEntry = {
  short_hash: string;
  author: string;
  date: string;
  summary: string;
  line_no: number;
};

export type BlameMode = "off" | "line" | "all";

export const useBlameSettings = create<{
  mode: BlameMode;
  toggle: () => void;
}>()(
  persist(
    (set) => ({
      mode: "off",
      toggle: () =>
        set((s) => ({
          mode: s.mode === "off" ? "line" : s.mode === "line" ? "all" : "off",
        })),
    }),
    { name: "blame-layer" },
  ),
);

export function attachBlameLayer(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);
  let byLine: Map<number, BlameEntry> = new Map();
  let loadedFor = "";
  let disposed = false;

  const clear = () => collection.clear();

  async function ensureLoaded() {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root || !absPath.startsWith(`${root}/`)) return false;
    const key = `${root}:${absPath}`;
    if (loadedFor === key && byLine.size > 0) return true;
    const rel = absPath.slice(root.length + 1);
    const entries = await invoke<BlameEntry[]>("repo_blame", {
      path: root,
      file: rel,
    }).catch(() => null);
    if (disposed || !entries) return false;
    byLine = new Map(entries.map((e) => [e.line_no, e]));
    loadedFor = key;
    return true;
  }

  async function render() {
    const mode = useBlameSettings.getState().mode;
    if (mode === "off") {
      clear();
      return;
    }
    const ok = await ensureLoaded();
    const model = editor.getModel();
    if (!ok || !model || disposed) return;

    const deco = (line: number, full: boolean) => {
      const entry = byLine.get(line);
      if (!entry?.short_hash) return null;
      const col = model.getLineMaxColumn(line);
      const content = full
        ? `    ${entry.author}, ${entry.date} · ${entry.summary}`
        : `   ${entry.author}, ${entry.date}`;
      return {
        range: new monaco.Range(line, col, line, col),
        options: {
          after: { content, inlineClassName: "l8-blame" },
          showIfCollapsed: true,
        },
      };
    };

    if (mode === "line") {
      const pos = editor.getPosition();
      const d = pos && deco(pos.lineNumber, true);
      collection.set(d ? [d] : []);
      return;
    }

    const decos = [];
    for (const vr of editor.getVisibleRanges()) {
      for (let l = vr.startLineNumber; l <= vr.endLineNumber; l++) {
        const d = deco(l, false);
        if (d) decos.push(d);
      }
    }
    collection.set(decos);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 120);
  };

  const subs = [
    editor.onDidChangeCursorPosition(schedule),
    editor.onDidScrollChange(() => {
      if (useBlameSettings.getState().mode === "all") schedule();
    }),
    editor.onDidChangeModelContent(() => {
      loadedFor = "";
      schedule();
    }),
  ];
  const unsubSettings = useBlameSettings.subscribe(() => void render());
  const unsubGit = useGitStore.subscribe(() => {
    loadedFor = "";
    schedule();
  });
  void render();

  editor.onDidDispose(() => {
    disposed = true;
    clearTimeout(timer);
    for (const s of subs) s.dispose();
    unsubSettings();
    unsubGit();
    collection.clear();
  });
}
