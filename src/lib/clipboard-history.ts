import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { pathFromMonacoUri } from "@/lib/monaco-uri";

export type ClipEntry = {
  id: number;
  text: string;
  path: string | null;
  time: number;
};

const MAX_ENTRIES = 50;
const MAX_TEXT = 20000;
let nextId = 1;

type ClipboardHistoryStore = {
  entries: ClipEntry[];
  dialogOpen: boolean;
  add: (text: string, path: string | null) => void;
  setDialogOpen: (open: boolean) => void;
  clear: () => void;
};

export const useClipboardHistory = create<ClipboardHistoryStore>()(
  persist(
    (set) => ({
      entries: [],
      dialogOpen: false,
      add: (text, path) =>
        set((s) => {
          const trimmed = text.slice(0, MAX_TEXT);
          if (!trimmed.trim() || s.entries[0]?.text === trimmed) return s;
          return {
            entries: [
              { id: nextId++, text: trimmed, path, time: Date.now() },
              ...s.entries.filter((e) => e.text !== trimmed),
            ].slice(0, MAX_ENTRIES),
          };
        }),
      setDialogOpen: (dialogOpen) => set({ dialogOpen }),
      clear: () => set({ entries: [] }),
    }),
    { name: "clipboard-history", partialize: (s) => ({ entries: s.entries }) },
  ),
);

let wired = false;

export function initClipboardCapture() {
  if (wired) return;
  wired = true;
  const capture = () => {
    const m = getMonacoInstance();
    if (!m) return;
    const editor = m.editor.getEditors().find((e) => e.hasTextFocus());
    const model = editor?.getModel();
    const sel = editor?.getSelection();
    if (!editor || !model || !sel || sel.isEmpty()) return;
    useClipboardHistory
      .getState()
      .add(model.getValueInRange(sel), pathFromMonacoUri(model.uri));
  };
  window.addEventListener("copy", capture, true);
  window.addEventListener("cut", capture, true);
}

export function pasteFromHistory(entry: ClipEntry) {
  void navigator.clipboard.writeText(entry.text).catch(() => {});
  const m = getMonacoInstance();
  const editor =
    m?.editor.getEditors().find((e) => e.hasTextFocus()) ??
    m?.editor.getEditors()[0];
  const sel = editor?.getSelection();
  if (!editor || !sel) return;
  editor.executeEdits("clipboard-history", [{ range: sel, text: entry.text }]);
  editor.focus();
}
