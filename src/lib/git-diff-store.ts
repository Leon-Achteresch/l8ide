import { create } from "zustand";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

export type DiffKind = "working" | "staged";
export type DiffDescriptor = { repoPath: string; file: string; kind: DiffKind };

export function diffRoute(kind: DiffKind, file: string) {
  return `/diff/${kind}/${file}`;
}

type GitDiffStore = {
  diffs: Record<string, DiffDescriptor>;
  openDiff: (repoPath: string, file: string, kind: DiffKind) => void;
};

export const useGitDiffStore = create<GitDiffStore>()((set) => ({
  diffs: {},
  openDiff: (repoPath, file, kind) => {
    const route = diffRoute(kind, file);
    set((s) => ({ diffs: { ...s.diffs, [route]: { repoPath, file, kind } } }));
    useWorkspaceStore.getState().openFile(pageTab(route));
  },
}));
