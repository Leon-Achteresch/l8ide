import { invoke } from "@tauri-apps/api/core";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { WorkspaceFs } from "./tools.ts";
import { useAgentEdits } from "@/lib/agent-edits";
import { useMarkersStore } from "@/lib/markers-store";
import { isPathTrusted } from "@/lib/workspace-trust";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { useWorkspaceStore } from "@/lib/workspace-store";

type SearchResponse = {
  files: Array<{ path: string; matches: Array<{ line: number; preview: string }> }>;
  total: number;
  truncated: boolean;
};

function requireRoot(): string {
  const root = useWorkspaceStore.getState().rootPath;
  if (!root) throw new Error("Kein Projekt geöffnet. Öffne zuerst einen Ordner.");
  return root.replace(/\/+$/, "");
}

const toAbs = (root: string, rel: string) => `${root}/${rel.replace(/^\/+/, "")}`;
const toRel = (root: string, abs: string) =>
  abs.startsWith(root + "/") ? abs.slice(root.length + 1) : abs;

// Nach dem Schreiben das offene Monaco-Model auf den Plattenstand ziehen.
function syncModel(absPath: string, content: string) {
  const model = getMonacoInstance()?.editor.getModel(monacoUriForPath(absPath));
  if (model && !model.isDisposed() && model.getValue() !== content) {
    model.setValue(content);
  }
}

/** Echtes Workspace-FS für die Tools, gebunden an den geöffneten Ordner. */
export const workspaceFs: WorkspaceFs = {
  async list() {
    const root = requireRoot();
    const abs = await invoke<string[]>("list_files", { root, hidden: [] });
    return abs.map((p) => toRel(root, p));
  },
  async read(path) {
    return readTextFile(toAbs(requireRoot(), path));
  },
  async write(path, content) {
    const abs = toAbs(requireRoot(), path);
    const before = (await exists(abs)) ? await readTextFile(abs) : null;
    await writeTextFile(abs, content);
    syncModel(abs, content);
    useAgentEdits.getState().record(path, before, content);
  },
  async exists(path) {
    return exists(toAbs(requireRoot(), path));
  },
  async exec(command) {
    const root = requireRoot();
    const { trustedFolders } = useWorkspaceStore.getState();
    if (!isPathTrusted(trustedFolders, root)) {
      return "FEHLER: Workspace ist nicht vertrauenswürdig (Restricted Mode). Kommandos sind deaktiviert.";
    }
    const res = await invoke<{
      code: number | null;
      stdout: string;
      stderr: string;
      timed_out: boolean;
    }>("run_shell", { cwd: root, command, timeoutMs: 60000 });
    const parts = [
      res.timed_out
        ? "TIMEOUT nach 60s (Prozess beendet)."
        : `Exit-Code: ${res.code ?? "unbekannt"}`,
    ];
    if (res.stdout.trim()) parts.push(`stdout:\n${res.stdout.trim()}`);
    if (res.stderr.trim()) parts.push(`stderr:\n${res.stderr.trim()}`);
    return parts.join("\n\n");
  },
  async diagnostics() {
    const root = requireRoot();
    const { byPath } = useMarkersStore.getState();
    const sev: Record<number, string> = { 8: "error", 4: "warning", 2: "info" };
    const lines: string[] = [];
    for (const [path, markers] of Object.entries(byPath)) {
      const rel = toRel(root, path);
      for (const m of markers.slice(0, 30)) {
        lines.push(
          `${rel}:${m.startLineNumber}: ${sev[m.severity] ?? "?"}: ${m.message}`,
        );
      }
    }
    if (lines.length === 0) return "Keine Diagnosen (keine Fehler/Warnungen).";
    return lines.slice(0, 200).join("\n");
  },
  async search(query) {
    const root = requireRoot();
    const res = await invoke<SearchResponse>("search_in_files", {
      root,
      options: {
        query,
        caseSensitive: false,
        wholeWord: false,
        regex: false,
        include: "",
        exclude: "",
      },
    });
    if (!res.files.length) return "Keine Treffer.";
    const lines: string[] = [];
    for (const f of res.files) {
      const rel = toRel(root, f.path);
      for (const m of f.matches.slice(0, 20)) {
        lines.push(`${rel}:${m.line}: ${m.preview.trim()}`);
      }
    }
    return lines.slice(0, 100).join("\n") + (res.truncated ? "\n… (gekürzt)" : "");
  },
};
