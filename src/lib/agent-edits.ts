import { writeTextFile, remove } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { useFileCompare } from "@/lib/file-compare";
import { languageOf } from "@/lib/language-of";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type AgentEdit = {
  id: string;
  path: string;
  before: string | null;
  after: string;
  reverted: boolean;
};

type AgentEditsStore = {
  edits: Record<string, AgentEdit>;
  lastId: string | null;
  record: (path: string, before: string | null, after: string) => string;
  revert: (id: string) => Promise<void>;
};

let counter = 0;

export const useAgentEdits = create<AgentEditsStore>()((set, get) => ({
  edits: {},
  lastId: null,
  record: (path, before, after) => {
    const id = `edit-${++counter}-${Date.now()}`;
    set((s) => ({
      edits: { ...s.edits, [id]: { id, path, before, after, reverted: false } },
      lastId: id,
    }));
    return id;
  },
  revert: async (id) => {
    const edit = get().edits[id];
    if (!edit || edit.reverted) return;
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    const abs = `${root}/${edit.path.replace(/^\/+/, "")}`;
    if (edit.before === null) {
      await remove(abs);
      useWorkspaceStore.getState().closeTab(abs);
    } else {
      await writeTextFile(abs, edit.before);
      const model = getMonacoInstance()?.editor.getModel(monacoUriForPath(abs));
      if (model && !model.isDisposed() && model.getValue() !== edit.before) {
        model.setValue(edit.before);
      }
    }
    set((s) => ({
      edits: { ...s.edits, [id]: { ...edit, reverted: true } },
    }));
  },
}));

export function openAgentEditDiff(id: string) {
  const edit = useAgentEdits.getState().edits[id];
  if (!edit) return;
  const name = edit.path.split("/").pop() ?? edit.path;
  useFileCompare
    .getState()
    .openCompare(
      { label: `${name} (vorher)`, text: edit.before ?? "" },
      { label: "Agent", text: edit.after },
      languageOf(edit.path),
    );
}
