import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutNode } from "@/lib/editor-groups";
import {
  useWorkspaceStore,
  type GroupState,
  type SidebarMode,
} from "@/lib/workspace-store";

type Snapshot = {
  groups: Record<string, GroupState>;
  layout: LayoutNode;
  activeGroupId: string;
  nextId: number;
  tabs: string[];
  pinned: string[];
  activeFile: string | null;
  sidebarMode: SidebarMode;
};

export type WorkContext = { name: string; time: number; snapshot: Snapshot };

function takeSnapshot(): Snapshot {
  const s = useWorkspaceStore.getState();
  return {
    groups: s.groups,
    layout: s.layout,
    activeGroupId: s.activeGroupId,
    nextId: s.nextId,
    tabs: s.tabs,
    pinned: s.pinned,
    activeFile: s.activeFile,
    sidebarMode: s.sidebarMode,
  };
}

type WorkContextsStore = {
  byRoot: Record<string, WorkContext[]>;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  save: (name: string) => void;
  apply: (name: string) => void;
  remove: (name: string) => void;
};

function rootKey(): string | null {
  return useWorkspaceStore.getState().rootPath;
}

export const useWorkContexts = create<WorkContextsStore>()(
  persist(
    (set, get) => ({
      byRoot: {},
      dialogOpen: false,
      setDialogOpen: (dialogOpen) => set({ dialogOpen }),
      save: (name) => {
        const root = rootKey();
        const trimmed = name.trim();
        if (!root || !trimmed) return;
        const ctx: WorkContext = {
          name: trimmed,
          time: Date.now(),
          snapshot: takeSnapshot(),
        };
        set((s) => ({
          byRoot: {
            ...s.byRoot,
            [root]: [
              ctx,
              ...(s.byRoot[root] ?? []).filter((c) => c.name !== trimmed),
            ],
          },
        }));
        toast.success(`Kontext „${trimmed}" gespeichert`);
      },
      apply: (name) => {
        const root = rootKey();
        if (!root) return;
        const ctx = (get().byRoot[root] ?? []).find((c) => c.name === name);
        if (!ctx) return;
        useWorkspaceStore.setState({ ...ctx.snapshot });
        set({ dialogOpen: false });
      },
      remove: (name) => {
        const root = rootKey();
        if (!root) return;
        set((s) => ({
          byRoot: {
            ...s.byRoot,
            [root]: (s.byRoot[root] ?? []).filter((c) => c.name !== name),
          },
        }));
      },
    }),
    { name: "work-contexts", partialize: (s) => ({ byRoot: s.byRoot }) },
  ),
);
