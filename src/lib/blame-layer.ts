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

export const useBlameSettings = create<{
  enabled: boolean;
  toggle: () => void;
}>()(
  persist(
    (set) => ({ enabled: false, toggle: () => set((s) => ({ enabled: !s.enabled })) }),
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
    if (!useBlameSettings.getState().enabled) {
      clear();
      return;
    }
    const ok = await ensureLoaded();
    const pos = editor.getPosition();
    if (!ok || !pos || disposed) return;
    const entry = byLine.get(pos.lineNumber);
    if (!entry || !entry.short_hash) {
      clear();
      return;
    }
    const model = editor.getModel();
    if (!model) return;
    const col = model.getLineMaxColumn(pos.lineNumber);
    collection.set([
      {
        range: new monaco.Range(pos.lineNumber, col, pos.lineNumber, col),
        options: {
          after: {
            content: `    ${entry.author}, ${entry.date} · ${entry.summary}`,
            inlineClassName: "l8-blame",
          },
          showIfCollapsed: true,
        },
      },
    ]);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void render(), 120);
  };

  const subs = [
    editor.onDidChangeCursorPosition(schedule),
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
