import { invoke } from "@tauri-apps/api/core";
import { exists, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { WorkspaceFs } from "./tools.ts";
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
    await writeTextFile(abs, content);
    syncModel(abs, content);
  },
  async exists(path) {
    return exists(toAbs(requireRoot(), path));
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
