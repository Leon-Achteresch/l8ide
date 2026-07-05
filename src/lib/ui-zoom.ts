import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_UI_ZOOM = 0.5;
const MAX_UI_ZOOM = 2;
const UI_ZOOM_STEP = 0.1;

type UiZoomState = {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

function clamp(zoom: number) {
  return Math.min(MAX_UI_ZOOM, Math.max(MIN_UI_ZOOM, Math.round(zoom * 100) / 100));
}

function apply(zoom: number) {
  document.documentElement.style.zoom = String(zoom);
}

export const useUiZoom = create<UiZoomState>()(
  persist(
    (set, get) => ({
      zoom: 1,
      zoomIn: () => {
        const zoom = clamp(get().zoom + UI_ZOOM_STEP);
        set({ zoom });
        apply(zoom);
      },
      zoomOut: () => {
        const zoom = clamp(get().zoom - UI_ZOOM_STEP);
        set({ zoom });
        apply(zoom);
      },
      reset: () => {
        set({ zoom: 1 });
        apply(1);
      },
    }),
    {
      name: "ui-zoom",
      onRehydrateStorage: () => (state) => {
        if (state) apply(state.zoom);
      },
    },
  ),
);
