import { create } from "zustand";

type ProjectLogoStore = {
  version: number;
  invalidate: () => void;
};

export const useProjectLogoStore = create<ProjectLogoStore>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}));
