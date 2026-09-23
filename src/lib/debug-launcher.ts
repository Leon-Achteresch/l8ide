import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { useDebugger } from "@/lib/debugger";
import { sq } from "@/lib/shell-quote";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

const DEBUGGABLE = /\.(mjs|cjs|js|mts|cts|ts|tsx)$/;

export async function nodeDebugCommand(root: string, program: string): Promise<string> {
  const tsFile = /\.(mts|cts|ts|tsx)$/i.test(program);
  const tsxInstalled = tsFile && await exists(`${root}/node_modules/tsx/package.json`).catch(() => false);
  if (/\.tsx$/i.test(program) && !tsxInstalled) {
    throw new Error("Für TSX-Debugging muss tsx im Projekt installiert sein.");
  }
  return `node --inspect-brk=9229${tsxInstalled ? " --import=tsx" : ""} ${sq(program)}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function inspectorReady(port: number): Promise<boolean> {
  try {
    const res = await invoke<ShellResult>("run_shell", {
      cwd: useWorkspaceStore.getState().rootPath ?? "/",
      command: `curl -s --max-time 1 http://127.0.0.1:${port}/json/list`,
      timeoutMs: 3000,
    });
    const targets = JSON.parse(res.stdout) as {
      webSocketDebuggerUrl?: string;
    }[];
    return targets.some((t) => t.webSocketDebuggerUrl);
  } catch {
    return false;
  }
}

export async function launchAndAttach(
  command: string,
  port = 9229,
): Promise<boolean> {
  if (await inspectorReady(port)) {
    toast.error(
      `Port ${port} ist schon von einem Inspector belegt — erst trennen/beenden.`,
    );
    return false;
  }
  const { runInTerminal } = await import("@/lib/terminal");
  await runInTerminal(command, { newGroup: true });
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await inspectorReady(port)) {
      await useDebugger.getState().connect(port);
      return true;
    }
  }
  toast.error("Inspector wurde nicht erreichbar (Timeout nach 10s).");
  return false;
}

export async function debugActiveFile() {
  const ws = useWorkspaceStore.getState();
  const path = ws.activeFile;
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!path || isPageTab(path) || !root) {
    toast.info("Keine debugbare Datei aktiv.");
    return;
  }
  if (!DEBUGGABLE.test(path)) {
    toast.info("Direkt debugbar sind JavaScript und TypeScript-Dateien.");
    return;
  }
  const rel = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  try {
    await launchAndAttach(await nodeDebugCommand(root, rel));
  } catch (error) {
    toast.error(String(error));
  }
}
