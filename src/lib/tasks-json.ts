import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { create } from "zustand";
import { buildTaskCommand, parseTasks, type Task } from "@/lib/tasks-json-core";
import { isPathTrusted } from "@/lib/workspace-trust";
import { useWorkspaceStore } from "@/lib/workspace-store";

const FILES = [".vscode/tasks.json", ".l8ide/tasks.json"];

export const useTaskPalette = create<{
  open: boolean;
  tasks: Task[];
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  tasks: [],
  setOpen: (open) => set({ open }),
}));

export async function loadTasks(root: string): Promise<void> {
  const base = root.replace(/\/+$/, "");
  for (const rel of FILES) {
    const path = `${base}/${rel}`;
    if (!(await exists(path).catch(() => false))) continue;
    const tasks = parseTasks(await readTextFile(path).catch(() => ""));
    if (tasks.length) {
      useTaskPalette.setState({ tasks });
      return;
    }
  }
  useTaskPalette.setState({ tasks: [] });
}

export async function runTask(task: Task): Promise<void> {
  const ws = useWorkspaceStore.getState();
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!root) {
    toast.error("Kein Projekt geöffnet.");
    return;
  }
  if (!isPathTrusted(ws.trustedFolders, root)) {
    toast.error("Workspace ist nicht vertrauenswürdig — Tasks sind deaktiviert.");
    return;
  }
  const command = buildTaskCommand(task, {
    workspaceFolder: root,
    file: ws.activeFile,
  });
  const { runInTerminal } = await import("@/lib/terminal");
  await runInTerminal(command);
}

export function openTaskPalette(): void {
  const tasks = useTaskPalette.getState().tasks;
  if (tasks.length === 0) {
    toast.info("Keine tasks.json gefunden (.vscode/tasks.json).");
    return;
  }
  useTaskPalette.getState().setOpen(true);
}
