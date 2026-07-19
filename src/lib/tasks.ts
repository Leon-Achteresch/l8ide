import { toast } from "sonner";
import {
  detectPackageManager,
  readScripts,
  scriptCommand,
} from "@/lib/run-scripts";
import { isPathTrusted } from "@/lib/workspace-trust";
import { useWorkspaceStore } from "@/lib/workspace-store";

async function runScriptTask(name: string) {
  const { rootPath, trustedFolders } = useWorkspaceStore.getState();
  if (!rootPath) {
    toast.error("Kein Projekt geöffnet.");
    return;
  }
  if (!isPathTrusted(trustedFolders, rootPath)) {
    toast.error("Workspace ist nicht vertrauenswürdig — Skripte sind deaktiviert.");
    return;
  }
  const scripts = await readScripts(rootPath);
  if (!scripts.some((s) => s.name === name)) {
    toast.info(`Kein „${name}"-Script in package.json gefunden.`);
    return;
  }
  const pm = await detectPackageManager(rootPath);
  const { runInTerminal } = await import("@/lib/terminal");
  await runInTerminal(scriptCommand(pm, name));
}

export function runBuildTask() {
  return runScriptTask("build");
}

export function runTestTask() {
  return runScriptTask("test");
}
