import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type StashEntry = {
  index: number;
  branch: string;
  subject: string;
  date: string;
  hash: string;
};

type StashStore = {
  open: boolean;
  entries: StashEntry[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  push: (message: string, includeUntracked: boolean) => Promise<void>;
  pop: (index: number) => Promise<void>;
  apply: (index: number) => Promise<void>;
  drop: (index: number) => Promise<void>;
};

function root() {
  return useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "") ?? null;
}

async function refresh() {
  await useStashStore.getState().load();
  await useGitStore.getState().refresh();
}

export const useStashStore = create<StashStore>()((set) => ({
  open: false,
  entries: [],
  loading: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useStashStore.getState().load();
  },
  load: async () => {
    const r = root();
    if (!r) return;
    set({ loading: true });
    const entries = await invoke<StashEntry[]>("list_stashes", {
      path: r,
    }).catch(() => [] as StashEntry[]);
    set({ entries, loading: false });
  },
  push: async (message, includeUntracked) => {
    const r = root();
    if (!r) return;
    try {
      const out = await invoke<string>("git_stash_push", {
        path: r,
        message: message || null,
        includeUntracked,
        keepIndex: false,
      });
      if (/No local changes/i.test(out)) {
        toast.info("Keine Änderungen zum Stashen.");
        return;
      }
      toast.success("Änderungen gestasht");
      await refresh();
    } catch (e) {
      toast.error(String(e));
    }
  },
  pop: async (index) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("git_stash_pop", { path: r, index });
      toast.success("Stash angewendet und entfernt");
      await refresh();
    } catch (e) {
      toast.error(String(e));
    }
  },
  apply: async (index) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("git_stash_apply", { path: r, index });
      toast.success("Stash angewendet");
      await refresh();
    } catch (e) {
      toast.error(String(e));
    }
  },
  drop: async (index) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("git_stash_drop", { path: r, index });
      toast.success("Stash verworfen");
      await refresh();
    } catch (e) {
      toast.error(String(e));
    }
  },
}));
