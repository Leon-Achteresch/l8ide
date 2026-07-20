import { create } from "zustand";
import type { FileMatches } from "@/lib/search-store";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

export type SearchSnapshot = {
  query: string;
  total: number;
  files: FileMatches[];
  time: number;
};

type SearchEditorStore = {
  snapshots: Record<string, SearchSnapshot>;
  openSnapshot: (snapshot: SearchSnapshot) => void;
};

let counter = 0;

export const useSearchEditor = create<SearchEditorStore>()((set) => ({
  snapshots: {},
  openSnapshot: (snapshot) => {
    counter += 1;
    const route = `/search-editor/${counter}`;
    set((s) => ({ snapshots: { ...s.snapshots, [route]: snapshot } }));
    useWorkspaceStore.getState().openFile(pageTab(route));
  },
}));
