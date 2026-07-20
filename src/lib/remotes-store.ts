import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type GitRemote = { name: string; url: string };

type RemotesStore = {
  open: boolean;
  remotes: GitRemote[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  add: (name: string, url: string) => Promise<void>;
  setUrl: (name: string, url: string) => Promise<void>;
};

function root() {
  return useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "") ?? null;
}

export const useRemotes = create<RemotesStore>()((set) => ({
  open: false,
  remotes: [],
  loading: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useRemotes.getState().load();
  },
  load: async () => {
    const r = root();
    if (!r) return;
    set({ loading: true });
    const remotes = await invoke<GitRemote[]>("list_git_remotes", {
      path: r,
    }).catch(() => [] as GitRemote[]);
    set({ remotes, loading: false });
  },
  add: async (name, url) => {
    const r = root();
    if (!r || !name.trim() || !url.trim()) return;
    try {
      await invoke("add_git_remote", { path: r, name: name.trim(), url: url.trim() });
      toast.success(`Remote „${name.trim()}" hinzugefügt`);
      await useRemotes.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
  setUrl: async (name, url) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("set_git_remote_url", { path: r, name, url: url.trim() });
      toast.success(`URL von „${name}" aktualisiert`);
      await useRemotes.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
}));
