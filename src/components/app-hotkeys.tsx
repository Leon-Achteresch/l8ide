import { useCommandHotkeys } from "@/lib/hotkeys";
import { isPageTab, pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";

function cycleTab(delta: number) {
  const s = useWorkspaceStore.getState();
  if (s.tabs.length === 0) return;
  const i = s.activeFile ? s.tabs.indexOf(s.activeFile) : -1;
  const next = s.tabs[(i + delta + s.tabs.length) % s.tabs.length];
  s.setActiveFile(next);
}

export function AppHotkeys() {
  const { resolvedTheme, setTheme } = useTheme();

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
    "theme.toggle": () =>
      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    "editor.save": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (!path || isPageTab(path)) return;
      const model = monaco.editor.getModel(monaco.Uri.parse(path));
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
  });

  return null;
}
