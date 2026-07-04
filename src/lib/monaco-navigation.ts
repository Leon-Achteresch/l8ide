import * as monaco from "monaco-editor";
import { pathFromMonacoUri, pathsEqual } from "@/lib/monaco-uri";
import { useWorkspaceStore } from "@/lib/workspace-store";

type RevealTarget = { line: number; column: number };

let pendingReveal: { path: string; target: RevealTarget } | null = null;
let openerRegistered = false;

function toRevealTarget(
  selectionOrPosition: monaco.IRange | monaco.IPosition,
): RevealTarget {
  if ("startLineNumber" in selectionOrPosition) {
    return {
      line: selectionOrPosition.startLineNumber,
      column: selectionOrPosition.startColumn,
    };
  }
  return {
    line: selectionOrPosition.lineNumber,
    column: selectionOrPosition.column,
  };
}

export function takePendingReveal(path: string): RevealTarget | null {
  if (!pendingReveal || !pathsEqual(pendingReveal.path, path)) {
    return null;
  }
  const target = pendingReveal.target;
  pendingReveal = null;
  return target;
}

export function revealInEditor(
  editor: monaco.editor.ICodeEditor,
  target: RevealTarget,
) {
  const position = { lineNumber: target.line, column: target.column };
  editor.setPosition(position);
  editor.revealPositionInCenter(position);
  editor.focus();
}

export function registerMonacoNavigation() {
  if (openerRegistered) return;
  openerRegistered = true;

  monaco.editor.registerEditorOpener({
    openCodeEditor(source, resource, selectionOrPosition) {
      const path = pathFromMonacoUri(resource);
      if (!path) return false;

      const target = selectionOrPosition
        ? toRevealTarget(selectionOrPosition)
        : { line: 1, column: 1 };

      const activeFile = useWorkspaceStore.getState().activeFile;
      if (activeFile && pathsEqual(activeFile, path)) {
        revealInEditor(source, target);
        return true;
      }

      pendingReveal = { path, target };
      useWorkspaceStore.getState().openFile(path);
      return true;
    },
  });
}
