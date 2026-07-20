import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

export type TagInfo = { name: string; short_hash: string; subject: string };

type TagsStore = {
  open: boolean;
  tags: TagInfo[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  load: () => Promise<void>;
  create: (name: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
};

function root() {
  return useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "") ?? null;
}

export const useTags = create<TagsStore>()((set) => ({
  open: false,
  tags: [],
  loading: false,
  setOpen: (open) => {
    set({ open });
    if (open) void useTags.getState().load();
  },
  load: async () => {
    const r = root();
    if (!r) return;
    set({ loading: true });
    const tags = await invoke<TagInfo[]>("list_tags", { path: r }).catch(
      () => [] as TagInfo[],
    );
    set({ tags, loading: false });
  },
  create: async (name) => {
    const r = root();
    if (!r || !name.trim()) return;
    try {
      await invoke("git_tag_commit", {
        path: r,
        name: name.trim(),
        commit: "HEAD",
      });
      toast.success(`Tag „${name.trim()}" auf HEAD gesetzt`);
      await useTags.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
  remove: async (name) => {
    const r = root();
    if (!r) return;
    try {
      await invoke("delete_tag", { path: r, name });
      toast.success(`Tag „${name}" gelöscht`);
      await useTags.getState().load();
    } catch (e) {
      toast.error(String(e));
    }
  },
}));
