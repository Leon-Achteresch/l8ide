import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspaceStore = {
  rootPath: string | null;
  setRootPath: (path: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      rootPath: null,
      setRootPath: (path) => set({ rootPath: path }),
    }),
    { name: "workspace-store" },
  ),
);
