import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceStore = {
  rootPath: string | null;
  activeFile: string | null;
  setRootPath: (path: string | null) => void;
  openFile: (path: string) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      rootPath: null,
      activeFile: null,
      setRootPath: (path) => set({ rootPath: path, activeFile: null }),
      openFile: (path) => set({ activeFile: path }),
    }),
    { name: "workspace-store" },
  ),
);
