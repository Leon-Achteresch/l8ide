import { clearBackup } from "@/lib/hot-exit";
import { snapshotBeforeSave } from "@/lib/local-history";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath, pathFromMonacoUri } from "@/lib/monaco-uri";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type * as monaco from "monaco-editor";

function activeEditor(): monaco.editor.ICodeEditor | null {
  const editors = getMonacoInstance()?.editor.getEditors() ?? [];
  return editors.find((e) => e.hasTextFocus()) ?? editors[0] ?? null;
}

export function saveModel(model: monaco.editor.ITextModel) {
  if (model.isDisposed()) return;
  const path = pathFromMonacoUri(model.uri);
  if (isPageTab(path)) return;
  const content = model.getValue();
  void snapshotBeforeSave(path).finally(() =>
    writeTextFile(path, content).then(() => {
      window.dispatchEvent(new CustomEvent("l8ide:file-saved", { detail: path }));
      void clearBackup(path);
      void import("@/lib/continuous-run").then((m) => m.onFileSaved(path));
      if (path.endsWith("/.l8ide/settings.json")) {
        const root = path.slice(0, -"/.l8ide/settings.json".length);
        void import("@/lib/workspace-settings").then((m) =>
          m.applyWorkspaceSettings(root),
        );
      }
    }),
  );
}

export function saveActiveFile() {
  const m = getMonacoInstance();
  const path = useWorkspaceStore.getState().activeFile;
  if (!m || !path || isPageTab(path)) return;
  const model = m.editor.getModel(monacoUriForPath(path));
  if (model) saveModel(model);
}

export function runEditorAction(actionId: string) {
  const editor = activeEditor();
  editor?.focus();
  void editor?.getAction(actionId)?.run();
}

export function undoActive() {
  activeEditor()?.trigger("editor-actions", "undo", null);
}

export function redoActive() {
  activeEditor()?.trigger("editor-actions", "redo", null);
}
