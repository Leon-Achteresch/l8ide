import type * as monaco from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { getRefactorWorker, isRefactorLanguage } from "@/lib/ts-refactor";
import type { TypeHierarchyDirection, TypeHierarchyNode } from "@/lib/type-hierarchy-core";

type HierarchyRoot = TypeHierarchyNode & {
  types: TypeHierarchyNode[];
  direction: TypeHierarchyDirection;
  workerModelUri: string;
};

export const useTypeHierarchy = create<{
  root: HierarchyRoot | null;
  close: () => void;
}>()((set) => ({
  root: null,
  close: () => set({ root: null }),
}));

export async function loadTypes(
  node: TypeHierarchyNode,
  direction: TypeHierarchyDirection,
): Promise<TypeHierarchyNode[]> {
  const monacoInstance = getMonacoInstance();
  const workerModelUri = useTypeHierarchy.getState().root?.workerModelUri;
  const model = monacoInstance && workerModelUri
    ? monacoInstance.editor.getModel(monacoInstance.Uri.parse(workerModelUri))
    : null;
  if (!model) return [];
  const worker = await getRefactorWorker(model);
  const result = await worker?.getTypeHierarchy(node.file, node.offset, direction).catch(() => null);
  return result?.types ?? [];
}

async function open(editor: monaco.editor.IStandaloneCodeEditor, direction: TypeHierarchyDirection) {
  const model = editor.getModel();
  const position = editor.getPosition();
  if (!model || !position || !isRefactorLanguage(model.getLanguageId())) return;
  const worker = await getRefactorWorker(model);
  const result = await worker?.getTypeHierarchy(
    model.uri.toString(), model.getOffsetAt(position), direction,
  ).catch(() => null);
  if (!result?.root) {
    toast.info("Keine Typ-Hierarchie an dieser Stelle.");
    return;
  }
  useTypeHierarchy.setState({ root: {
    ...result.root, types: result.types, direction, workerModelUri: model.uri.toString(),
  } });
}

export function attachTypeHierarchy(editor: monaco.editor.IStandaloneCodeEditor) {
  editor.addAction({
    id: "l8ide.base-types",
    label: "Obertypen anzeigen",
    contextMenuGroupId: "navigation",
    run: () => void open(editor, "base"),
  });
  editor.addAction({
    id: "l8ide.derived-types",
    label: "Untertypen anzeigen",
    contextMenuGroupId: "navigation",
    run: () => void open(editor, "derived"),
  });
}
