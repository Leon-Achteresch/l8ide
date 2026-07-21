import { create } from "zustand";
import { persist } from "zustand/middleware";
import { matchesAnyGlob } from "@/lib/glob-match";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ReadonlyStore = {
  globs: string[];
  sessionPaths: string[];
  setGlobs: (globs: string[]) => void;
  toggleSession: (path: string) => void;
};

export const useReadonly = create<ReadonlyStore>()(
  persist(
    (set) => ({
      globs: [],
      sessionPaths: [],
      setGlobs: (globs) => set({ globs }),
      toggleSession: (path) =>
        set((s) => ({
          sessionPaths: s.sessionPaths.includes(path)
            ? s.sessionPaths.filter((p) => p !== path)
            : [...s.sessionPaths, path],
        })),
    }),
    { name: "readonly-globs", partialize: (s) => ({ globs: s.globs }) },
  ),
);

export function relForRoot(path: string): string {
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
  return root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

export function isPathReadonly(path: string): boolean {
  const s = useReadonly.getState();
  if (s.sessionPaths.includes(path)) return true;
  return matchesAnyGlob(relForRoot(path), s.globs);
}
