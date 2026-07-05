import type * as monaco from "monaco-editor";
import { getMonacoInstance } from "@/lib/monaco-instance";
import {
  monacoUriForPath,
  pathFromMonacoUri,
  pathsEqual,
} from "@/lib/monaco-uri";
import { useWorkspaceStore } from "@/lib/workspace-store";

type RevealTarget = { line: number; column: number; endColumn?: number };

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
  if (target.endColumn != null) {
    const range = {
      startLineNumber: target.line,
      startColumn: target.column,
      endLineNumber: target.line,
      endColumn: target.endColumn,
    };
    editor.setSelection(range);
    editor.revealRangeInCenter(range);
  } else {
    const position = { lineNumber: target.line, column: target.column };
    editor.setPosition(position);
    editor.revealPositionInCenter(position);
  }
  editor.focus();
}

export function openFileAt(path: string, target: RevealTarget) {
  const m = getMonacoInstance();
  const activeFile = useWorkspaceStore.getState().activeFile;
  if (m && activeFile && pathsEqual(activeFile, path)) {
    const uri = monacoUriForPath(path).toString();
    const editor = m.editor
      .getEditors()
      .find((e) => e.getModel()?.uri.toString() === uri);
    if (editor) {
      revealInEditor(editor, target);
      return;
    }
  }
  pendingReveal = { path, target };
  useWorkspaceStore.getState().openFile(path);
}

export function registerMonacoNavigation() {
  const m = getMonacoInstance();
  if (openerRegistered || !m) return;
  openerRegistered = true;

  m.editor.registerEditorOpener({
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
