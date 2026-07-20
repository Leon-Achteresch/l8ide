import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type ReflogEntry = {
  short_hash: string;
  selector: string;
  action: string;
  subject: string;
};

type ReflogStore = {
  open: boolean;
  entries: ReflogEntry[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  resetTo: (entry: ReflogEntry) => Promise<void>;
};

export const useReflog = create<ReflogStore>()((set) => ({
  open: false,
  entries: [],
  loading: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useReflog.getState().load();
  },
  load: async () => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    set({ loading: true });
    const entries = await invoke<ReflogEntry[]>("git_reflog", {
      path: root,
    }).catch(() => [] as ReflogEntry[]);
    set({ entries, loading: false });
  },
  resetTo: async (entry) => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    try {
      await invoke("git_reset", {
        path: root,
        target: entry.short_hash,
        mode: "hard",
      });
      toast.success(`Auf ${entry.short_hash} zurückgesetzt`);
      set({ open: false });
      await useGitStore.getState().refresh();
    } catch (e) {
      toast.error(String(e));
    }
  },
}));
