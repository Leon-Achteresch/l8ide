import { create } from "zustand";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import type { StatusEntry } from "@/lib/git-store";

export type ConflictDescriptor = { repoPath: string; file: string };

export function conflictRoute(file: string) {
  return `/conflict/${file}`;
}

export function isConflictEntry(e: StatusEntry) {
  const i = e.index_status.toUpperCase();
  const w = e.worktree_status.toUpperCase();
  return (
    i.includes("U") ||
    w.includes("U") ||
    (i === "A" && w === "A") ||
    (i === "D" && w === "D")
  );
}

type MergeConflictStore = {
  conflicts: Record<string, ConflictDescriptor>;
  openConflict: (repoPath: string, file: string) => void;
};

export const useMergeConflictStore = create<MergeConflictStore>()((set) => ({
  conflicts: {},
  openConflict: (repoPath, file) => {
    const route = conflictRoute(file);
    set((s) => ({ conflicts: { ...s.conflicts, [route]: { repoPath, file } } }));
    useWorkspaceStore.getState().openFile(pageTab(route));
  },
}));
