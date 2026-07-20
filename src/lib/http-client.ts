import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import {
  applyEnv,
  missingVars,
  parseHttpFile,
  requestAtLine,
  toCurlArgs,
  type HttpRequest,
} from "@/lib/http-parse";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

async function loadEnv(selected: string): Promise<Record<string, string>> {
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
  if (!root) return {};
  const path = `${root}/.l8ide/http-env.json`;
  if (!(await exists(path).catch(() => false))) return {};
  try {
    const json = JSON.parse(await readTextFile(path)) as Record<
      string,
      Record<string, string>
    >;
    return json[selected] ?? {};
  } catch {
    toast.error(".l8ide/http-env.json ist kein gültiges JSON.");
    return {};
  }
}

type HttpClientStore = {
  open: boolean;
  running: boolean;
  request: HttpRequest | null;
  status: string;
  headers: string;
  body: string;
  ms: number;
  error: string | null;
  environment: string;
  setEnvironment: (env: string) => void;
  close: () => void;
  runAtCursor: (path: string) => Promise<void>;
};

function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

function splitResponse(raw: string): { status: string; headers: string; body: string } {
  const blocks = raw.split(/\r?\n\r?\n/);
  let headerIdx = 0;
  while (
    headerIdx + 1 < blocks.length &&
    /^HTTP\/\d/.test(blocks[headerIdx + 1])
  ) {
    headerIdx++;
  }
  const headerBlock = blocks[headerIdx] ?? "";
  const body = blocks.slice(headerIdx + 1).join("\n\n");
  const lines = headerBlock.split(/\r?\n/);
  return { status: lines[0] ?? "", headers: lines.slice(1).join("\n"), body };
}

export const useHttpClient = create<HttpClientStore>()(
  persist(
    (set) => ({
  open: false,
  running: false,
  request: null,
  status: "",
  headers: "",
  body: "",
  ms: 0,
  error: null,
  environment: "default",
  setEnvironment: (environment) => set({ environment }),
  close: () => set({ open: false }),
  runAtCursor: async (path) => {
    const m = getMonacoInstance();
    const model = m?.editor.getModel(monacoUriForPath(path));
    const editor = m?.editor
      .getEditors()
      .find((e) => e.getModel()?.uri.toString() === monacoUriForPath(path).toString());
    if (!model) return;
    const reqs = parseHttpFile(model.getValue());
    const line = editor?.getPosition()?.lineNumber ?? 1;
    const rawReq = requestAtLine(reqs, line);
    if (!rawReq) {
      set({ open: true, request: null, error: "Keine Anfrage gefunden.", status: "", headers: "", body: "" });
      return;
    }
    const vars = await loadEnv(useHttpClient.getState().environment);
    const missing = missingVars(rawReq, vars);
    const req = applyEnv(rawReq, vars);
    set({
      open: true,
      running: true,
      request: req,
      error: missing.length
        ? `Nicht gesetzte Variablen: ${missing.join(", ")}`
        : null,
      status: "",
      headers: "",
      body: "",
    });
    const root = useWorkspaceStore.getState().rootPath ?? "/";
    const command = `curl ${toCurlArgs(req).map(shellQuote).join(" ")} -w '\\n__L8_MS__:%{time_total}'`;
    const started = Date.now();
    try {
      const res = await invoke<ShellResult>("run_shell", {
        cwd: root,
        command,
        timeoutMs: 30000,
      });
      const ms = Date.now() - started;
      if (res.code !== 0 && !res.stdout) {
        set({ running: false, error: res.stderr.trim() || "Anfrage fehlgeschlagen.", ms });
        return;
      }
      const raw = res.stdout.replace(/\n__L8_MS__:[\d.]+\s*$/, "");
      const { status, headers, body } = splitResponse(raw);
      set({ running: false, status, headers, body, ms, error: null });
    } catch (e) {
      set({ running: false, error: String(e), ms: Date.now() - started });
    }
  },
    }),
    { name: "http-client", partialize: (s) => ({ environment: s.environment }) },
  ),
);
