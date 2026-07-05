import { getMonacoInstance } from "@/lib/monaco-instance";
import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useHotkeyRecording } from "@/lib/hotkey-recording";
import { useHotkeySettings, zoomInUsesNumpad } from "@/lib/hotkeys";

export const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 40;
const ZOOM_STEP = 1;

type EditorZoomState = {
  fontSize: number;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

function applyFontSize(fontSize: number) {
  for (const editor of getMonacoInstance()?.editor.getEditors() ?? []) {
    editor.updateOptions({ fontSize });
  }
}

function clampFontSize(size: number) {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
}

export const useEditorZoom = create<EditorZoomState>()(
  persist(
    (set, get) => ({
      fontSize: DEFAULT_FONT_SIZE,
      zoomIn: () => {
        const fontSize = clampFontSize(get().fontSize + ZOOM_STEP);
        set({ fontSize });
        applyFontSize(fontSize);
      },
      zoomOut: () => {
        const fontSize = clampFontSize(get().fontSize - ZOOM_STEP);
        set({ fontSize });
        applyFontSize(fontSize);
      },
      reset: () => {
        set({ fontSize: DEFAULT_FONT_SIZE });
        applyFontSize(DEFAULT_FONT_SIZE);
      },
    }),
    { name: "editor-zoom" },
  ),
);

function isModZoomIn(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    (event.code === "NumpadAdd" || event.code === "Equal")
  );
}

export function useModZoomInHotkey(enabled: boolean) {
  const isRecording = useHotkeyRecording((s) => s.isRecording);
  const overrides = useHotkeySettings((s) => s.overrides);
  const modZoomEnabled = enabled && zoomInUsesNumpad(overrides) && !isRecording;

  useEffect(() => {
    if (!modZoomEnabled) return;

    const handler = (event: KeyboardEvent) => {
      if (!isModZoomIn(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      useEditorZoom.getState().zoomIn();
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [modZoomEnabled]);
}
