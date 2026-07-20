import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import {
  getRefactorWorker,
  isRefactorLanguage,
  type CallHierarchyNode,
} from "@/lib/ts-refactor";

export type HierarchyRoot = {
  name: string;
  file: string;
  line: number;
  column: number;
  calls: CallHierarchyNode[];
};

type CallHierarchyStore = {
  root: HierarchyRoot | null;
  close: () => void;
};

export const useCallHierarchy = create<CallHierarchyStore>()((set) => ({
  root: null,
  close: () => set({ root: null }),
}));

export async function loadIncomingCalls(
  model: monacoNs.editor.ITextModel,
  file: string,
  offset: number,
): Promise<CallHierarchyNode[]> {
  const worker = await getRefactorWorker(model);
  if (!worker?.getIncomingCalls) return [];
  const res = await worker.getIncomingCalls(file, offset).catch(() => null);
  return res?.calls ?? [];
}

export function attachCallHierarchy(
  editor: monacoNs.editor.IStandaloneCodeEditor,
) {
  editor.addAction({
    id: "l8ide.incoming-calls",
    label: "Eingehende Aufrufe anzeigen",
    contextMenuGroupId: "navigation",
    run: async () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      if (!model || !position || !isRefactorLanguage(model.getLanguageId()))
        return;
      const worker = await getRefactorWorker(model);
      if (!worker?.getIncomingCalls) return;
      const offset = model.getOffsetAt(position);
      const res = await worker
        .getIncomingCalls(model.uri.toString(), offset)
        .catch(() => null);
      if (!res?.root) {
        toast.info("Keine Aufruf-Hierarchie an dieser Stelle.");
        return;
      }
      useCallHierarchy.setState({
        root: { ...res.root, calls: res.calls },
      });
    },
  });
}
