import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";

type FileIndexState = {
  rootPath: string | null;
  files: string[];
  loading: boolean;
  generation: number;
  ensureIndex: (
    rootPath: string,
    hiddenNames: string[],
    wsHidden: string[],
  ) => void;
  invalidate: () => void;
};

async function collectFiles(root: string, hidden: Set<string>): Promise<string[]> {
  try {
    return await invoke<string[]>("list_files", { root, hidden: [...hidden] });
  } catch {
    return [];
  }
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  let score = 0;
  let consecutive = 0;
  let lastMatch = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    if (lastMatch === ti - 1) consecutive++;
    else consecutive = 1;
    score += consecutive > 1 ? consecutive * 3 : 1;
    if (ti === 0 || "/._-".includes(t[ti - 1]!)) score += 8;
    if (t[ti] === q[qi]) score += 2;
    lastMatch = ti;
    qi++;
  }

  return qi === q.length ? score : 0;
}

export function filterFiles(
  files: string[],
  query: string,
  recentTabs: string[],
  limit = 50,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) {
    const recent = recentTabs.filter(
      (t) => !isPageTab(t) && files.includes(t),
    );
    const recentSet = new Set(recent);
    const rest: string[] = [];
    for (const f of files) {
      if (rest.length >= limit - recent.length) break;
      if (!recentSet.has(f)) rest.push(f);
    }
    return [...recent, ...rest].slice(0, limit);
  }

  const ranked: { path: string; score: number }[] = [];
  for (const path of files) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const score = Math.max(fuzzyScore(trimmed, name) * 3, fuzzyScore(trimmed, path));
    if (score > 0) ranked.push({ path, score });
  }

  ranked.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return ranked.slice(0, limit).map((r) => r.path);
}

export const useFileIndexStore = create<FileIndexState>()((set, get) => ({
  rootPath: null,
  files: [],
  loading: false,
  generation: 0,

  ensureIndex: (rootPath, hiddenNames, wsHidden) => {
    const state = get();
    if (state.rootPath === rootPath && state.files.length > 0 && !state.loading) {
      return;
    }
    if (state.rootPath === rootPath && state.loading) return;

    const hidden = new Set([...hiddenNames, ...wsHidden]);
    const generation = state.generation + 1;

    set({ rootPath, loading: true, generation });

    collectFiles(rootPath, hidden).then((files) => {
      const current = get();
      if (current.generation !== generation) return;
      set({ files, loading: false });
    });
  },

  invalidate: () => {
    const { generation } = get();
    set({ files: [], loading: false, generation: generation + 1 });
  },
}));

export function refreshFileIndex() {
  const ws = useWorkspaceStore.getState();
  if (!ws.rootPath) return;
  const store = useFileIndexStore.getState();
  store.invalidate();
  store.ensureIndex(
    ws.rootPath,
    ws.hiddenNames,
    ws.workspaceHidden[ws.rootPath] ?? [],
  );
}
