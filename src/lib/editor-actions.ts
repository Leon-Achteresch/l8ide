import { monacoUriForPath, pathFromMonacoUri } from "@/lib/monaco-uri";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";

function activeEditor(): monaco.editor.ICodeEditor | null {
  const editors = monaco.editor.getEditors();
  return editors.find((e) => e.hasTextFocus()) ?? editors[0] ?? null;
}

export function saveModel(model: monaco.editor.ITextModel) {
  const path = pathFromMonacoUri(model.uri);
  if (isPageTab(path)) return;
  void writeTextFile(path, model.getValue());
}

export function saveActiveFile() {
  const path = useWorkspaceStore.getState().activeFile;
  if (!path || isPageTab(path)) return;
  const model = monaco.editor.getModel(monacoUriForPath(path));
  if (model) saveModel(model);
}

export function undoActive() {
  activeEditor()?.trigger("editor-actions", "undo", null);
}

export function redoActive() {
  activeEditor()?.trigger("editor-actions", "redo", null);
}
