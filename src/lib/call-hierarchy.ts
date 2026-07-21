import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import {
  getRefactorWorker,
  isRefactorLanguage,
  type CallHierarchyNode,
} from "@/lib/ts-refactor";

export type Direction = "incoming" | "outgoing";

export type HierarchyRoot = {
  name: string;
  file: string;
  line: number;
  column: number;
  calls: CallHierarchyNode[];
  direction: Direction;
};

type CallHierarchyStore = {
  root: HierarchyRoot | null;
  close: () => void;
};

export const useCallHierarchy = create<CallHierarchyStore>()((set) => ({
  root: null,
  close: () => set({ root: null }),
}));

export async function loadCalls(
  model: monacoNs.editor.ITextModel,
  file: string,
  offset: number,
  direction: Direction,
): Promise<CallHierarchyNode[]> {
  const worker = await getRefactorWorker(model);
  const fn =
    direction === "incoming" ? worker?.getIncomingCalls : worker?.getOutgoingCalls;
  if (!fn) return [];
  const res = await fn(file, offset).catch(() => null);
  return res?.calls ?? [];
}

async function open(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  direction: Direction,
) {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position || !isRefactorLanguage(model.getLanguageId())) return;
  const worker = await getRefactorWorker(model);
  const fn =
    direction === "incoming" ? worker?.getIncomingCalls : worker?.getOutgoingCalls;
  if (!fn) return;
  const offset = model.getOffsetAt(position);
  const res = await fn(model.uri.toString(), offset).catch(() => null);
  if (!res?.root) {
    toast.info("Keine Aufruf-Hierarchie an dieser Stelle.");
    return;
  }
  useCallHierarchy.setState({
    root: { ...res.root, calls: res.calls, direction },
  });
}

export function attachCallHierarchy(
  editor: monacoNs.editor.IStandaloneCodeEditor,
) {
  editor.addAction({
    id: "l8ide.incoming-calls",
    label: "Eingehende Aufrufe anzeigen",
    contextMenuGroupId: "navigation",
    run: () => void open(editor, "incoming"),
  });
  editor.addAction({
    id: "l8ide.outgoing-calls",
    label: "Ausgehende Aufrufe anzeigen",
    contextMenuGroupId: "navigation",
    run: () => void open(editor, "outgoing"),
  });
}
