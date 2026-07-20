import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type WorktreeEntry = {
  path: string;
  head: string;
  branch: string | null;
  is_main: boolean;
  is_locked: boolean;
};

type WorktreeStore = {
  open: boolean;
  entries: WorktreeEntry[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  add: (dir: string, branch: string) => Promise<void>;
  remove: (dir: string) => Promise<void>;
  switchTo: (dir: string) => void;
};

export const useWorktrees = create<WorktreeStore>()((set) => ({
  open: false,
  entries: [],
  loading: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useWorktrees.getState().load();
  },
  load: async () => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    set({ loading: true });
    const entries = await invoke<WorktreeEntry[]>("list_worktrees", {
      path: root,
    }).catch(() => [] as WorktreeEntry[]);
    set({ entries, loading: false });
  },
  add: async (dir, branch) => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    try {
      await invoke("git_worktree_add", {
        path: root,
        worktreePath: dir,
        branch: branch || null,
        newBranch: null,
      });
      toast.success("Worktree angelegt");
      await useWorktrees.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
  remove: async (dir) => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    try {
      await invoke("git_worktree_remove", {
        path: root,
        worktreePath: dir,
        force: false,
      });
      toast.success("Worktree entfernt");
      await useWorktrees.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
  switchTo: (dir) => {
    useWorkspaceStore.getState().setRootPath(dir);
    set({ open: false });
    toast.success("Zu Worktree gewechselt");
  },
}));
