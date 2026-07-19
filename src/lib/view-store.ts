import { getCurrentWindow } from "@tauri-apps/api/window";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TabSizing = "shrink" | "fixed";

type ViewStore = {
  zenMode: boolean;
  centeredLayout: boolean;
  tabSizing: TabSizing;
  screencastMode: boolean;
  toggleZen: () => void;
  exitZen: () => void;
  toggleCentered: () => void;
  setTabSizing: (mode: TabSizing) => void;
  toggleScreencast: () => void;
};

function fullscreen(on: boolean) {
  void getCurrentWindow().setFullscreen(on).catch(() => {});
}

export const useViewStore = create<ViewStore>()(
  persist(
    (set) => ({
      zenMode: false,
      centeredLayout: false,
      tabSizing: "shrink",
      toggleZen: () =>
        set((s) => {
          const zenMode = !s.zenMode;
          fullscreen(zenMode);
          return { zenMode };
        }),
      exitZen: () =>
        set((s) => {
          if (!s.zenMode) return s;
          fullscreen(false);
          return { zenMode: false };
        }),
      toggleCentered: () => set((s) => ({ centeredLayout: !s.centeredLayout })),
      setTabSizing: (tabSizing) => set({ tabSizing }),
      screencastMode: false,
      toggleScreencast: () =>
        set((s) => ({ screencastMode: !s.screencastMode })),
    }),
    {
      name: "view-store",
      partialize: (s) => ({
        centeredLayout: s.centeredLayout,
        tabSizing: s.tabSizing,
      }),
    },
  ),
);

export function toggleFullscreen() {
  const win = getCurrentWindow();
  void win
    .isFullscreen()
    .then((f) => win.setFullscreen(!f))
    .catch(() => {});
}
