import { create } from "zustand";
import { persist } from "zustand/middleware";

type TerminalStore = {
  open: boolean;
  height: number;
  tabs: number[];
  active: number | null;
  nextId: number;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setHeight: (height: number) => void;
  add: () => void;
  remove: (id: number) => void;
  setActive: (id: number) => void;
};

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set) => ({
      open: false,
      height: 280,
      tabs: [],
      active: null,
      nextId: 1,
      toggle: () =>
        set((s) => {
          const open = !s.open;
          if (open && s.tabs.length === 0) {
            return { open, tabs: [s.nextId], active: s.nextId, nextId: s.nextId + 1 };
          }
          return { open };
        }),
      setOpen: (open) => set({ open }),
      setHeight: (height) =>
        set({ height: Math.max(80, Math.min(window.innerHeight - 160, height)) }),
      add: () =>
        set((s) => ({
          open: true,
          tabs: [...s.tabs, s.nextId],
          active: s.nextId,
          nextId: s.nextId + 1,
        })),
      remove: (id) =>
        set((s) => {
          const i = s.tabs.indexOf(id);
          const tabs = s.tabs.filter((t) => t !== id);
          return {
            tabs,
            active:
              s.active === id ? (tabs[Math.min(i, tabs.length - 1)] ?? null) : s.active,
            open: tabs.length > 0 ? s.open : false,
          };
        }),
      setActive: (id) => set({ active: id }),
    }),
    {
      name: "terminal-store",
      partialize: (s) => ({ height: s.height }),
    },
  ),
);
