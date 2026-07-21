import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type SubmoduleEntry = {
  name: string;
  path: string;
  url: string;
  commit: string;
  branch: string | null;
  behind_count: number | null;
  local_changes: number | null;
  is_detached: boolean;
};

type SubmoduleStore = {
  open: boolean;
  entries: SubmoduleEntry[];
  loading: boolean;
  busy: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  update: (subPath?: string) => Promise<void>;
  sync: (subPath: string) => Promise<void>;
};

function root() {
  return useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "") ?? null;
}

export const useSubmodules = create<SubmoduleStore>()((set) => ({
  open: false,
  entries: [],
  loading: false,
  busy: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useSubmodules.getState().load();
  },
  load: async () => {
    const r = root();
    if (!r) return;
    set({ loading: true });
    const entries = await invoke<SubmoduleEntry[]>("list_submodules", {
      path: r,
    }).catch(() => [] as SubmoduleEntry[]);
    set({ entries, loading: false });
  },
  update: async (subPath) => {
    const r = root();
    if (!r) return;
    set({ busy: true });
    try {
      await invoke("git_submodule_update", {
        path: r,
        submodulePath: subPath ?? null,
        init: true,
        recursive: true,
      });
      toast.success(subPath ? `„${subPath}" aktualisiert` : "Submodule aktualisiert");
      await useSubmodules.getState().load();
    } catch (e) {
      toast.error(String(e));
    } finally {
      set({ busy: false });
    }
  },
  sync: async (subPath) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("git_submodule_sync", { path: r, submodulePath: subPath });
      toast.success("URL synchronisiert");
    } catch (e) {
      toast.error(String(e));
    }
  },
}));
