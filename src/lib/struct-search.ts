import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import {
  searchStructural,
  structuralReplace,
  type StructMatch,
} from "@/lib/struct-search-core";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { useRefactorPreview, type FileEdit } from "@/lib/refactor-preview";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type StructFileResult = { path: string; matches: StructMatch[] };

type SearchResponse = { files: Array<{ path: string }> };

function literalPrefix(pattern: string): string {
  const m = /^[^$]+/.exec(pattern.trim());
  const lit = (m?.[0] ?? "").trim();
  return lit.length >= 2 ? lit : "";
}

type StructSearchStore = {
  open: boolean;
  pattern: string;
  replacement: string;
  results: StructFileResult[];
  running: boolean;
  total: number;
  setOpen: (open: boolean) => void;
  setPattern: (pattern: string) => void;
  setReplacement: (replacement: string) => void;
  run: () => Promise<void>;
  previewReplace: () => Promise<void>;
};

export const useStructSearch = create<StructSearchStore>()((set, get) => ({
  open: false,
  pattern: "",
  replacement: "",
  results: [],
  running: false,
  total: 0,
  setOpen: (open) => set({ open }),
  setPattern: (pattern) => set({ pattern }),
  setReplacement: (replacement) => set({ replacement }),

  previewReplace: async () => {
    const { pattern, replacement, results } = get();
    if (!pattern.trim() || results.length === 0) return;
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const edits: FileEdit[] = [];
    for (const file of results) {
      const oldText = await readTextFile(file.path).catch(() => null);
      if (oldText === null) continue;
      const { output, count } = structuralReplace(oldText, pattern, replacement);
      if (count === 0 || output === oldText) continue;
      edits.push({
        uri: monacoUriForPath(file.path).toString(),
        path: file.path,
        isNew: false,
        oldText,
        newText: output,
        changes: [{ span: { start: 0, length: oldText.length }, newText: output }],
      });
    }
    if (edits.length === 0) {
      toast.info("Keine Änderungen.");
      return;
    }
    set({ open: false });
    useRefactorPreview.getState().show({
      title: `Struktur-Replace: ${pattern} → ${replacement} · ${edits.length} Datei(en)`,
      edits,
    });
  },
  run: async () => {
    const pattern = get().pattern.trim();
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!pattern || !root) return;
    set({ running: true });
    const prefix = literalPrefix(pattern);
    let candidates: string[] = [];
    try {
      const res = await invoke<SearchResponse>("search_in_files", {
        root,
        options: {
          query: prefix || pattern.replace(/\$\$\$|\$\w+/g, "").trim(),
          caseSensitive: false,
          wholeWord: false,
          regex: false,
          include: "",
          exclude: "",
        },
      });
      candidates = res.files.map((f) => f.path);
    } catch {
      candidates = [];
    }
    const results: StructFileResult[] = [];
    let total = 0;
    for (const path of candidates.slice(0, 300)) {
      const content = await readTextFile(path).catch(() => "");
      const matches = searchStructural(content, pattern);
      if (matches.length > 0) {
        results.push({ path, matches });
        total += matches.length;
      }
    }
    set({ results, total, running: false });
  },
}));
