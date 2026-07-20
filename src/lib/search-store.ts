import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { useRefactorPreview, type FileEdit } from "@/lib/refactor-preview";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { create } from "zustand";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildReplacePattern(s: {
  query: string;
  useRegex: boolean;
  wholeWord: boolean;
  caseSensitive: boolean;
}): RegExp {
  let src = s.useRegex ? s.query : escapeRegExp(s.query);
  if (s.wholeWord) src = `\\b(?:${src})\\b`;
  return new RegExp(src, s.caseSensitive ? "g" : "gi");
}

export type SearchMatch = {
  line: number;
  column: number;
  length: number;
  preview: string;
};

export type FileMatches = {
  path: string;
  matches: SearchMatch[];
};

type SearchResponse = {
  files: FileMatches[];
  total: number;
  truncated: boolean;
};

type SearchStore = {
  query: string;
  replaceValue: string;
  include: string;
  exclude: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  noIgnore: boolean;
  openOnly: boolean;
  showReplace: boolean;
  showFilters: boolean;
  files: FileMatches[];
  total: number;
  truncated: boolean;
  searching: boolean;
  replacing: boolean;
  searched: boolean;
  error: string | null;
  collapsed: Record<string, boolean>;
  generation: number;
  setQuery: (v: string) => void;
  setReplaceValue: (v: string) => void;
  setInclude: (v: string) => void;
  setExclude: (v: string) => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  toggleRegex: () => void;
  toggleNoIgnore: () => void;
  toggleOpenOnly: () => void;
  toggleShowReplace: () => void;
  toggleShowFilters: () => void;
  toggleCollapsed: (path: string) => void;
  dismissFile: (path: string) => void;
  dismissMatch: (path: string, match: SearchMatch) => void;
  search: (root: string) => Promise<void>;
  replaceAll: (root: string) => Promise<void>;
  previewReplaceAll: () => Promise<void>;
  replaceFile: (root: string, path: string) => Promise<void>;
  replaceOne: (root: string, path: string, match: SearchMatch) => Promise<void>;
};

function openEditorGlobs(): string {
  const ws = useWorkspaceStore.getState();
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!root) return "";
  const paths = new Set<string>();
  for (const group of Object.values(ws.groups)) {
    for (const tab of group.tabs) {
      if (!isPageTab(tab) && tab.startsWith(`${root}/`)) {
        paths.add(tab.slice(root.length + 1));
      }
    }
  }
  return [...paths].join(",");
}

function backendOptions(s: SearchStore) {
  const include = s.openOnly
    ? [openEditorGlobs(), s.include].filter(Boolean).join(",")
    : s.include;
  return {
    query: s.query,
    caseSensitive: s.caseSensitive,
    wholeWord: s.wholeWord,
    regex: s.useRegex,
    include,
    exclude: s.exclude,
    noIgnore: s.noIgnore,
  };
}

async function syncOpenModels(paths: string[]) {
  const monaco = getMonacoInstance();
  if (!monaco) return;
  for (const path of paths) {
    const model = monaco.editor.getModel(monacoUriForPath(path));
    if (!model) continue;
    try {
      const content = await readTextFile(path);
      if (model.getValue() !== content) model.setValue(content);
    } catch {
      continue;
    }
  }
}

export const useSearchStore = create<SearchStore>()((set, get) => ({
  query: "",
  replaceValue: "",
  include: "",
  exclude: "",
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  noIgnore: false,
  openOnly: false,
  showReplace: false,
  showFilters: false,
  files: [],
  total: 0,
  truncated: false,
  searching: false,
  replacing: false,
  searched: false,
  error: null,
  collapsed: {},
  generation: 0,

  setQuery: (v) => set({ query: v }),
  setReplaceValue: (v) => set({ replaceValue: v }),
  setInclude: (v) => set({ include: v }),
  setExclude: (v) => set({ exclude: v }),
  toggleCaseSensitive: () => set((s) => ({ caseSensitive: !s.caseSensitive })),
  toggleWholeWord: () => set((s) => ({ wholeWord: !s.wholeWord })),
  toggleRegex: () => set((s) => ({ useRegex: !s.useRegex })),
  toggleNoIgnore: () => set((s) => ({ noIgnore: !s.noIgnore })),
  toggleOpenOnly: () => set((s) => ({ openOnly: !s.openOnly })),
  toggleShowReplace: () => set((s) => ({ showReplace: !s.showReplace })),
  toggleShowFilters: () => set((s) => ({ showFilters: !s.showFilters })),
  toggleCollapsed: (path) =>
    set((s) => ({
      collapsed: { ...s.collapsed, [path]: !s.collapsed[path] },
    })),

  dismissFile: (path) =>
    set((s) => {
      const files = s.files.filter((f) => f.path !== path);
      return { files, total: files.reduce((n, f) => n + f.matches.length, 0) };
    }),

  dismissMatch: (path, match) =>
    set((s) => {
      const files = s.files
        .map((f) =>
          f.path === path
            ? { ...f, matches: f.matches.filter((m) => m !== match) }
            : f,
        )
        .filter((f) => f.matches.length > 0);
      return { files, total: files.reduce((n, f) => n + f.matches.length, 0) };
    }),

  search: async (root) => {
    const generation = get().generation + 1;
    if (!get().query.trim()) {
      set({
        generation,
        files: [],
        total: 0,
        truncated: false,
        searching: false,
        searched: false,
        error: null,
      });
      return;
    }
    set({ generation, searching: true, error: null });
    try {
      const res = await invoke<SearchResponse>("search_in_files", {
        root,
        options: backendOptions(get()),
      });
      if (get().generation !== generation) return;
      set({
        files: res.files,
        total: res.total,
        truncated: res.truncated,
        searching: false,
        searched: true,
        collapsed: {},
      });
    } catch (e) {
      if (get().generation !== generation) return;
      set({
        error: String(e),
        files: [],
        total: 0,
        truncated: false,
        searching: false,
        searched: true,
      });
    }
  },

  previewReplaceAll: async () => {
    const s = get();
    if (s.files.length === 0) return;
    let pattern: RegExp;
    try {
      pattern = buildReplacePattern(s);
    } catch (e) {
      toast.error(`Ungültige Regex: ${e instanceof Error ? e.message : e}`);
      return;
    }
    const replacement = s.useRegex
      ? s.replaceValue
      : s.replaceValue.replace(/\$/g, "$$$$");
    const edits: FileEdit[] = [];
    for (const f of s.files) {
      const oldText = await readTextFile(f.path).catch(() => null);
      if (oldText === null) continue;
      pattern.lastIndex = 0;
      const newText = oldText.replace(pattern, replacement);
      if (newText === oldText) continue;
      edits.push({
        uri: monacoUriForPath(f.path).toString(),
        path: f.path,
        isNew: false,
        oldText,
        newText,
        changes: [{ span: { start: 0, length: oldText.length }, newText }],
      });
    }
    if (edits.length === 0) {
      toast.info("Keine Änderungen.");
      return;
    }
    useRefactorPreview.getState().show({
      title: `Ersetzen: „${s.query}" → „${s.replaceValue}" · ${edits.length} Datei(en)`,
      edits,
    });
  },

  replaceAll: async (root) => {
    const paths = get().files.map((f) => f.path);
    if (paths.length === 0) return;
    set({ replacing: true });
    try {
      const changed = await invoke<string[]>("replace_in_files", {
        paths,
        options: backendOptions(get()),
        replacement: get().replaceValue,
      });
      await syncOpenModels(changed);
    } catch (e) {
      set({ error: String(e) });
    }
    set({ replacing: false });
    await get().search(root);
  },

  replaceFile: async (root, path) => {
    set({ replacing: true });
    try {
      const changed = await invoke<string[]>("replace_in_files", {
        paths: [path],
        options: backendOptions(get()),
        replacement: get().replaceValue,
      });
      await syncOpenModels(changed);
    } catch (e) {
      set({ error: String(e) });
    }
    set({ replacing: false });
    await get().search(root);
  },

  replaceOne: async (root, path, match) => {
    try {
      await invoke("replace_match", {
        path,
        options: backendOptions(get()),
        replacement: get().replaceValue,
        line: match.line,
        column: match.column,
      });
      await syncOpenModels([path]);
    } catch (e) {
      set({ error: String(e) });
    }
    await get().search(root);
  },
}));
