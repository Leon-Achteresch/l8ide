import { monacoUriForPath } from "@/lib/monaco-uri";
import { useEditorZoom, useModZoomInHotkey } from "@/lib/editor-zoom";
import { useCommandHotkeys } from "@/lib/hotkeys";
import { isPageTab, pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { useFileSearchStore } from "@/components/file-search";
import { SEARCH_INPUT_ID } from "@/components/search-panel";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;

function isTextEditorActive(path: string | null) {
  return Boolean(path && !isPageTab(path) && !IMAGE_EXTENSIONS.test(path));
}

function cycleTab(delta: number) {
  const s = useWorkspaceStore.getState();
  if (s.tabs.length === 0) return;
  const i = s.activeFile ? s.tabs.indexOf(s.activeFile) : -1;
  const next = s.tabs[(i + delta + s.tabs.length) % s.tabs.length];
  s.setActiveFile(next);
}

export function AppHotkeys() {
  const { resolvedTheme, setTheme } = useTheme();
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const textEditorActive = isTextEditorActive(activeFile);

  useModZoomInHotkey(textEditorActive);

  useCommandHotkeys({
    "sidebar.toggle": () => useWorkspaceStore.getState().toggleSidebar(),
    "folder.open": async () => {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") {
        useWorkspaceStore.getState().setRootPath(selected);
      }
    },
    "settings.open": () =>
      useWorkspaceStore.getState().openFile(pageTab("/settings")),
    "shortcuts.open": () =>
      useWorkspaceStore.getState().openFile(pageTab("/shortcuts")),
    "file.search": () => useFileSearchStore.getState().setOpen(true),
    "search.workspace": () => {
      const s = useWorkspaceStore.getState();
      s.setSidebarMode("Search");
      if (!s.sidebarOpen) s.toggleSidebar();
      requestAnimationFrame(() => {
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      });
    },
    "theme.toggle": () =>
      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    "editor.save": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (!path || isPageTab(path)) return;
      const model = monaco.editor.getModel(monacoUriForPath(path));
      if (model) writeTextFile(path, model.getValue());
    },
    "tab.close": () => {
      const s = useWorkspaceStore.getState();
      if (s.activeFile) s.closeTab(s.activeFile);
    },
    "tab.closeAll": () => useWorkspaceStore.getState().closeAll(),
    "tab.pin": () => {
      const s = useWorkspaceStore.getState();
      if (s.activeFile) s.togglePin(s.activeFile);
    },
    "tab.next": () => cycleTab(1),
    "tab.prev": () => cycleTab(-1),
    ...Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [
        `tab.goto${i + 1}`,
        () => {
          const s = useWorkspaceStore.getState();
          const tab = s.tabs[i];
          if (tab) s.setActiveFile(tab);
        },
      ]),
    ),
    "editor.zoomIn": () => {
      if (!textEditorActive) return;
      useEditorZoom.getState().zoomIn();
    },
    "editor.zoomOut": () => {
      if (!textEditorActive) return;
      useEditorZoom.getState().zoomOut();
    },
    "editor.zoomReset": () => {
      if (!textEditorActive) return;
      useEditorZoom.getState().reset();
    },
  },
  undefined,
  {
    "editor.zoomIn": { preventDefault: true, enabled: textEditorActive },
    "editor.zoomOut": { preventDefault: true, enabled: textEditorActive },
    "editor.zoomReset": { preventDefault: true, enabled: textEditorActive },
  });

  return null;
}
