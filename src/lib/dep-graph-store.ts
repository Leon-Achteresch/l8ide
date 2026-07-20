import { create } from "zustand";
import { analyzeDeps, type DepsResult } from "@/lib/file-deps";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

type DepGraphStore = {
  byRoute: Record<string, { result: DepsResult | null; loading: boolean }>;
  openGraph: (path: string) => void;
  recenter: (route: string, path: string) => Promise<void>;
};

let counter = 0;

export const useDepGraph = create<DepGraphStore>()((set, get) => ({
  byRoute: {},

  openGraph: (path) => {
    counter += 1;
    const route = `/deps/${counter}`;
    set((s) => ({
      byRoute: { ...s.byRoute, [route]: { result: null, loading: true } },
    }));
    useWorkspaceStore.getState().openFile(pageTab(route));
    void get().recenter(route, path);
  },

  recenter: async (route, path) => {
    set((s) => ({
      byRoute: {
        ...s.byRoute,
        [route]: { result: s.byRoute[route]?.result ?? null, loading: true },
      },
    }));
    const result = await analyzeDeps(path);
    set((s) => ({
      byRoute: { ...s.byRoute, [route]: { result, loading: false } },
    }));
  },
}));
