import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useDebugger } from "@/lib/debugger";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

const DEBUGGABLE = /\.(mjs|cjs|js)$/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function inspectorReady(port: number): Promise<boolean> {
  try {
    const res = await invoke<ShellResult>("run_shell", {
      cwd: "/",
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

export async function debugActiveFile() {
  const ws = useWorkspaceStore.getState();
  const path = ws.activeFile;
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!path || isPageTab(path) || !root) {
    toast.info("Keine debugbare Datei aktiv.");
    return;
  }
  if (!DEBUGGABLE.test(path)) {
    toast.info(
      "Direkt debugbar sind .js/.mjs/.cjs — TypeScript vorher bauen oder Prozess manuell mit --inspect starten und ⌥⌘D verbinden.",
    );
    return;
  }
  const port = 9229;
  if (await inspectorReady(port)) {
    toast.error(
      `Port ${port} ist schon von einem Inspector belegt — erst trennen/beenden.`,
    );
    return;
  }
  const rel = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  const { runInTerminal } = await import("@/lib/terminal");
  await runInTerminal(`node --inspect-brk=${port} "${rel}"`);
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await inspectorReady(port)) {
      await useDebugger.getState().connect(port);
      return;
    }
  }
  toast.error("Inspector wurde nicht erreichbar (Timeout nach 10s).");
}
