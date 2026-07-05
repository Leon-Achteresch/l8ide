import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type StatusEntry = {
  path: string;
  index_status: string;
  worktree_status: string;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
  additions_staged: number;
  deletions_staged: number;
  additions_unstaged: number;
  deletions_unstaged: number;
  binary: boolean;
  embedded_repo: boolean;
};

type FullStatus = {
  entries: StatusEntry[];
  upstream_sync: { ahead: number; behind: number };
  has_upstream: boolean;
};

export type BranchInfo = {
  name: string;
  is_current: boolean;
  is_remote: boolean;
  tip: string;
  behind: number | null;
};

type RepoInfo = {
  path: string;
  branch: string;
  branches: BranchInfo[];
};

type GitStore = {
  branch: string | null;
  ahead: number;
  behind: number;
  hasUpstream: boolean;
  entries: StatusEntry[];
  branches: BranchInfo[];
  commitMessage: string;
  busy: boolean;
  loaded: boolean;
  error: string | null;
  setCommitMessage: (v: string) => void;
  reset: () => void;
  refresh: () => Promise<void>;
  loadBranches: () => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  stage: (files: string[]) => Promise<void>;
  unstage: (files: string[]) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  commit: (amend?: boolean) => Promise<void>;
  checkout: (name: string) => Promise<void>;
  fetch: () => Promise<void>;
  pull: () => Promise<void>;
  push: () => Promise<void>;
};

function root(): string | null {
  return useWorkspaceStore.getState().rootPath;
}

function describeError(e: unknown): string {
  const s = String(e);
  if (s.startsWith("__LOCAL_CHANGES_BLOCK__|")) {
    return "Lokale Änderungen würden überschrieben. Bitte committen oder stashen.";
  }
  return s;
}

export const useGitStore = create<GitStore>()((set, get) => ({
  branch: null,
  ahead: 0,
  behind: 0,
  hasUpstream: false,
  entries: [],
  branches: [],
  commitMessage: "",
  busy: false,
  loaded: false,
  error: null,

  setCommitMessage: (v) => set({ commitMessage: v }),

  reset: () =>
    set({
      branch: null,
      ahead: 0,
      behind: 0,
      hasUpstream: false,
      entries: [],
      loaded: false,
      error: null,
    }),

  refresh: async () => {
    const path = root();
    if (!path) {
      get().reset();
      return;
    }
    try {
      const [full, branch] = await Promise.all([
        invoke<FullStatus>("repo_full_status", { path }),
        invoke<string>("git_current_branch", { path }),
      ]);
      set({
        entries: full.entries,
        ahead: full.upstream_sync.ahead,
        behind: full.upstream_sync.behind,
        hasUpstream: full.has_upstream,
        branch: branch || null,
        loaded: true,
        error: null,
      });
    } catch (e) {
      set({ error: describeError(e), branch: null, entries: [], loaded: true });
    }
  },

  stage: async (files) => {
    const path = root();
    if (!path || files.length === 0) return;
    try {
      await invoke("stage_files", { path, files });
    } catch (e) {
      toast.error(describeError(e));
    }
    await get().refresh();
  },

  unstage: async (files) => {
    const path = root();
    if (!path || files.length === 0) return;
    try {
      await invoke("unstage_files", { path, files });
    } catch (e) {
      toast.error(describeError(e));
    }
    await get().refresh();
  },

  stageAll: async () => {
    const files = get()
      .entries.filter((e) => e.unstaged || e.untracked)
      .map((e) => e.path);
    await get().stage(files);
  },

  unstageAll: async () => {
    const files = get()
      .entries.filter((e) => e.staged)
      .map((e) => e.path);
    await get().unstage(files);
  },

  commit: async (amend = false) => {
    const path = root();
    const message = get().commitMessage.trim();
    if (!path || !message) return;
    set({ busy: true });
    try {
      await invoke(amend ? "commit_amend" : "commit_changes", { path, message });
      set({ commitMessage: "" });
      toast.success(amend ? "Commit geändert" : "Commit erstellt");
    } catch (e) {
      toast.error(describeError(e));
    }
    set({ busy: false });
    await get().refresh();
  },

  checkout: async (name) => {
    const path = root();
    if (!path) return;
    try {
      await invoke("git_checkout", { path, refName: name, create: false });
    } catch (e) {
      toast.error(describeError(e));
    }
    await get().refresh();
  },

  loadBranches: async () => {
    const path = root();
    if (!path) return;
    try {
      const info = await invoke<RepoInfo>("open_repo", { path });
      set({ branches: info.branches });
    } catch (e) {
      set({ error: describeError(e) });
    }
  },

  createBranch: async (name) => {
    const path = root();
    const n = name.trim();
    if (!path || !n) return;
    try {
      await invoke("git_create_branch", { path, name: n, checkout: true });
      toast.success(`Branch „${n}“ erstellt`);
    } catch (e) {
      toast.error(describeError(e));
      return;
    }
    await get().refresh();
    await get().loadBranches();
  },

  fetch: async () => {
    const path = root();
    if (!path) return;
    set({ busy: true });
    try {
      await invoke<string>("git_fetch", { path });
      toast.success("Fetch abgeschlossen");
    } catch (e) {
      toast.error(describeError(e));
    }
    set({ busy: false });
    await get().refresh();
  },

  pull: async () => {
    const path = root();
    if (!path) return;
    set({ busy: true });
    try {
      const out = await invoke<string>("git_pull", { path });
      toast.success("Pull", out.trim() ? { description: out.trim().slice(0, 200) } : undefined);
    } catch (e) {
      toast.error(describeError(e));
    }
    set({ busy: false });
    await get().refresh();
  },

  push: async () => {
    const path = root();
    if (!path) return;
    set({ busy: true });
    try {
      const out = await invoke<string>("git_push", {
        path,
        setUpstream: !get().hasUpstream,
      });
      toast.success("Push", out.trim() ? { description: out.trim().slice(0, 200) } : undefined);
    } catch (e) {
      toast.error(describeError(e));
    }
    set({ busy: false });
    await get().refresh();
  },
}));
