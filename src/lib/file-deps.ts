import { invoke } from "@tauri-apps/api/core";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import {
  extractImportSpecifiers,
  resolutionCandidates,
} from "@/lib/file-deps-core";
import { useWorkspaceStore } from "@/lib/workspace-store";

const ALIASES = { "@": "src" };

type SearchResponse = {
  files: Array<{ path: string }>;
  total: number;
  truncated: boolean;
};

export type DepsResult = {
  path: string;
  imports: string[];
  externals: string[];
  importers: string[];
};

async function resolveSpec(
  spec: string,
  fromDir: string,
  root: string,
): Promise<string | null> {
  for (const candidate of resolutionCandidates(spec, fromDir, root, ALIASES)) {
    if (await exists(candidate).catch(() => false)) return candidate;
  }
  return null;
}

export async function analyzeDeps(path: string): Promise<DepsResult> {
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "") ?? "";
  const dir = path.slice(0, path.lastIndexOf("/"));
  const source = await readTextFile(path).catch(() => "");
  const specs = extractImportSpecifiers(source);
  const imports: string[] = [];
  const externals: string[] = [];
  for (const spec of specs) {
    const resolved = await resolveSpec(spec, dir, root);
    if (resolved) imports.push(resolved);
    else if (!spec.startsWith(".")) externals.push(spec);
  }

  const name = path.split("/").pop() ?? "";
  const stem = name.replace(/\.(tsx?|jsx?|mjs|cjs)$/, "");
  const importers: string[] = [];
  if (root && stem) {
    const res = await invoke<SearchResponse>("search_in_files", {
      root,
      options: {
        query: `from ["'][^"']*${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        caseSensitive: true,
        wholeWord: false,
        regex: true,
        include: "",
        exclude: "",
      },
    }).catch(() => null);
    for (const f of res?.files ?? []) {
      if (f.path === path) continue;
      const fromDir = f.path.slice(0, f.path.lastIndexOf("/"));
      const fSource = await readTextFile(f.path).catch(() => "");
      for (const spec of extractImportSpecifiers(fSource)) {
        if ((await resolveSpec(spec, fromDir, root)) === path) {
          importers.push(f.path);
          break;
        }
      }
    }
  }
  return { path, imports, externals, importers };
}

type FileDepsStore = {
  result: DepsResult | null;
  loading: boolean;
  openFor: (path: string) => Promise<void>;
  close: () => void;
};

export const useFileDeps = create<FileDepsStore>()((set) => ({
  result: null,
  loading: false,
  openFor: async (path) => {
    set({ loading: true, result: { path, imports: [], externals: [], importers: [] } });
    const result = await analyzeDeps(path);
    set({ result, loading: false });
  },
  close: () => set({ result: null, loading: false }),
}));
