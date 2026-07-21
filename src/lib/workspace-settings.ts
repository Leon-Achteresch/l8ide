import { exists, mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { useEditorSettings } from "@/lib/editor-settings";
import { usePrettierSettings } from "@/lib/prettier-format";
import { useRefactorSettings } from "@/lib/ts-refactor";
import { useWorkspaceStore } from "@/lib/workspace-store";

type WorkspaceSettings = {
  autoSave?: boolean;
  autoSaveDelay?: number;
  formatOnSave?: boolean;
  organizeImportsOnSave?: boolean;
  semanticValidation?: boolean;
  hidden?: string[];
};

export function workspaceSettingsPath(root: string): string {
  return `${root.replace(/\/+$/, "")}/.l8ide/settings.json`;
}

export async function applyWorkspaceSettings(root: string) {
  void import("@/lib/user-snippets").then((m) => m.loadProjectSnippets(root));
  const path = workspaceSettingsPath(root);
  if (!(await exists(path).catch(() => false))) return;
  let json: WorkspaceSettings;
  try {
    json = JSON.parse(await readTextFile(path)) as WorkspaceSettings;
  } catch (e) {
    toast.error(
      `.l8ide/settings.json konnte nicht gelesen werden: ${e instanceof Error ? e.message : e}`,
    );
    return;
  }
  const ws = useWorkspaceStore.getState();
  if (typeof json.autoSave === "boolean") ws.setAutoSave(json.autoSave);
  if (typeof json.autoSaveDelay === "number")
    ws.setAutoSaveDelay(json.autoSaveDelay);
  if (Array.isArray(json.hidden)) {
    const hidden = json.hidden.filter((h) => typeof h === "string");
    useWorkspaceStore.setState((s) => ({
      workspaceHidden: { ...s.workspaceHidden, [root]: hidden },
    }));
  }
  if (typeof json.formatOnSave === "boolean")
    usePrettierSettings.getState().setFormatOnSave(json.formatOnSave);
  if (typeof json.organizeImportsOnSave === "boolean")
    useRefactorSettings
      .getState()
      .setOrganizeImportsOnSave(json.organizeImportsOnSave);
  if (typeof json.semanticValidation === "boolean")
    useEditorSettings.getState().setSemanticValidation(json.semanticValidation);
}

const TEMPLATE = `{
  "autoSave": true,
  "autoSaveDelay": 1000,
  "formatOnSave": false,
  "organizeImportsOnSave": false,
  "semanticValidation": true,
  "hidden": []
}
`;

export async function openWorkspaceSettings() {
  const root = useWorkspaceStore.getState().rootPath;
  if (!root) {
    toast.error("Kein Projekt geöffnet.");
    return;
  }
  const path = workspaceSettingsPath(root);
  if (!(await exists(path).catch(() => false))) {
    await mkdir(`${root}/.l8ide`, { recursive: true });
    await writeTextFile(path, TEMPLATE);
  }
  useWorkspaceStore.getState().openFile(path);
}
