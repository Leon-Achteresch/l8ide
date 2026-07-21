import { formatActiveEditor, formatAndSaveActive } from "@/lib/prettier-format";
import { useEditorZoom, useModZoomInHotkey } from "@/lib/editor-zoom";
import { useCommandHotkeys } from "@/lib/hotkeys";
import { useBrowserStore } from "@/lib/browser-store";
import { useChatStore } from "@/lib/chat-store";
import { useTerminalStore } from "@/lib/terminal-store";
import { toggleFullscreen, useViewStore } from "@/lib/view-store";
import { isPageTab, pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { useFileSearchStore } from "@/components/file-search";
import { useCommandPalette } from "@/components/command-palette";
import { setCommandRegistry } from "@/lib/command-registry";
import { useClipboardHistory } from "@/lib/clipboard-history";
import { useFileHeatmap } from "@/lib/file-heatmap";
import { openProjectNotes } from "@/lib/project-notes";
import { openWorkspaceSettings } from "@/lib/workspace-settings";
import { useDebugger } from "@/lib/debugger";
import { debugActiveFile } from "@/lib/debug-launcher";
import { openLaunchPalette } from "@/lib/launch-config";
import { useFileDeps } from "@/lib/file-deps";
import { useStructSearch } from "@/lib/struct-search";
import { useHttpClient } from "@/lib/http-client";
import { useWorkContexts } from "@/lib/workspace-contexts";
import { useLocalHistoryDialog } from "@/lib/local-history";
import { useBlameSettings } from "@/lib/blame-layer";
import { toggleBookmarkHere, jumpBookmark } from "@/lib/bookmarks";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { useFocusTimer } from "@/lib/focus-timer";
import { useReflog } from "@/lib/reflog-store";
import { useReadonly } from "@/lib/readonly-globs";
import { useWorktrees } from "@/lib/worktree-store";
import { useStashStore } from "@/lib/stash-store";
import { useRemotes } from "@/lib/remotes-store";
import { useTags } from "@/lib/tags-store";
import { useSubmodules } from "@/lib/submodule-store";
import { runBuildTask, runTestTask } from "@/lib/tasks";
import { useTransformPalette } from "@/components/transform-palette";
import { useRegexTester } from "@/components/regex-tester-dialog";
import { upsertToc } from "@/lib/markdown-toc";
import { curlToHttp } from "@/lib/curl-to-http";
import { toast } from "sonner";
import { useScriptPalette } from "@/components/script-palette";
import { useNavHistory } from "@/lib/nav-history";
import { open } from "@tauri-apps/plugin-dialog";
import { useTheme } from "next-themes";
import { SEARCH_INPUT_ID } from "@/components/search-panel/search-panel";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;

function isTextEditorActive(path: string | null) {
  return Boolean(path && !isPageTab(path) && !IMAGE_EXTENSIONS.test(path));
}

function focusedEditor() {
  const editors = getMonacoInstance()?.editor.getEditors() ?? [];
  return editors.find((e) => e.hasTextFocus()) ?? editors[0] ?? null;
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

  const handlers: Record<string, () => void> = {
    "command.palette": () => useCommandPalette.getState().setOpen(true),
    "welcome.open": () =>
      useWorkspaceStore.getState().openFile(pageTab("/welcome")),
    "scripts.palette": () => useScriptPalette.getState().setOpen(true),
    "task.build": () => void runBuildTask(),
    "task.test": () => void runTestTask(),
    "view.screencast": () => useViewStore.getState().toggleScreencast(),
    "focus.toggle": () => {
      const f = useFocusTimer.getState();
      if (f.phase === "idle") f.start("focus");
      else f.stop();
    },
    "clipboard.history": () =>
      useClipboardHistory.getState().setDialogOpen(true),
    "workspace.contexts": () =>
      useWorkContexts.getState().setDialogOpen(true),
    "explorer.heatmap": () => useFileHeatmap.getState().toggle(),
    "project.notes": () => void openProjectNotes(),
    "workspace.settings": () => void openWorkspaceSettings(),
    "debug.attach": () => void useDebugger.getState().connect(),
    "debug.file": () => void debugActiveFile(),
    "debug.launch": () => openLaunchPalette(),
    "search.structural": () => useStructSearch.getState().setOpen(true),
    "http.run": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (path && !isPageTab(path) && /\.(http|rest)$/.test(path))
        void useHttpClient.getState().runAtCursor(path);
    },
    "project.graph": () =>
      useWorkspaceStore.getState().openFile(pageTab("/project-graph")),
    "deps.dashboard": () =>
      useWorkspaceStore.getState().openFile(pageTab("/dependencies")),
    "design.tokens": () =>
      useWorkspaceStore.getState().openFile(pageTab("/design-tokens")),
    "processes.dashboard": () =>
      useWorkspaceStore.getState().openFile(pageTab("/processes")),
    "file.deps": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (path && !isPageTab(path)) void useFileDeps.getState().openFor(path);
    },
    "blame.toggle": () => useBlameSettings.getState().toggle(),
    "bookmark.toggle": () => {
      const ed = focusedEditor();
      if (ed) toggleBookmarkHere(ed);
    },
    "bookmark.next": () => {
      const ed = focusedEditor();
      const line = ed?.getPosition()?.lineNumber;
      if (line) jumpBookmark(1, line);
    },
    "git.reflog": () => useReflog.getState().setOpen(true),
    "git.worktrees": () => useWorktrees.getState().setOpen(true),
    "git.stashes": () => useStashStore.getState().setOpen(true),
    "git.remotes": () => useRemotes.getState().setOpen(true),
    "git.tags": () => useTags.getState().setOpen(true),
    "git.submodules": () => useSubmodules.getState().setOpen(true),
    "git.history": () =>
      useWorkspaceStore.getState().openFile(pageTab("/git-history")),
    "git.sync": () =>
      useWorkspaceStore.getState().openFile(pageTab("/git-sync")),
    "editor.toggleReadonly": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (!path || isPageTab(path)) return;
      useReadonly.getState().toggleSession(path);
    },
    "repo.insights": () =>
      useWorkspaceStore.getState().openFile(pageTab("/insights")),
    "history.local": () => {
      const path = useWorkspaceStore.getState().activeFile;
      if (path && !isPageTab(path)) useLocalHistoryDialog.getState().openFor(path);
    },
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
    "symbol.workspace": () => useFileSearchStore.getState().openWith("#"),
    "search.workspace": () => {
      const s = useWorkspaceStore.getState();
      s.setSidebarMode("Search");
      if (!s.sidebarOpen) s.toggleSidebar();
      requestAnimationFrame(() => {
        document.getElementById(SEARCH_INPUT_ID)?.focus();
      });
    },
    "scm.focus": () => {
      const s = useWorkspaceStore.getState();
      s.setSidebarMode("Scm");
      if (!s.sidebarOpen) s.toggleSidebar();
    },
    "terminal.toggle": () => useTerminalStore.getState().toggle(),
    "browser.toggle": () => useBrowserStore.getState().toggle(),
    "chat.toggle": () => useChatStore.getState().toggle(),
    "theme.toggle": () =>
      setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    "editor.save": () => void formatAndSaveActive(),
    "transform.selection": () => useTransformPalette.getState().setOpen(true),
    "regex.tester": () => useRegexTester.getState().setOpen(true),
    "curl.import": async () => {
      const clip = await navigator.clipboard.readText().catch(() => "");
      if (!/^\s*curl\b/.test(clip)) {
        toast.info("Kein curl-Befehl in der Zwischenablage.");
        return;
      }
      try {
        const http = curlToHttp(clip);
        const ed = focusedEditor();
        const sel = ed?.getSelection();
        if (ed && sel) {
          ed.executeEdits("curl", [{ range: sel, text: `${http}\n` }]);
          toast.success("cURL als .http eingefügt");
        } else {
          await navigator.clipboard.writeText(http);
          toast.success("cURL umgewandelt (in Zwischenablage)");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    "markdown.toc": () => {
      const ed = focusedEditor();
      const model = ed?.getModel();
      if (!ed || !model || !/\.(md|markdown|mdx)$/i.test(model.uri.path)) {
        toast.info("Nur in Markdown-Dateien.");
        return;
      }
      const next = upsertToc(model.getValue());
      ed.executeEdits("toc", [{ range: model.getFullModelRange(), text: next }]);
      toast.success("Inhaltsverzeichnis aktualisiert");
    },
    "editor.format": () => {
      if (textEditorActive) formatActiveEditor();
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
    "editor.splitRight": () => useWorkspaceStore.getState().splitGroup("row"),
    "editor.splitDown": () => useWorkspaceStore.getState().splitGroup("col"),
    "editor.closeGroup": () => {
      const s = useWorkspaceStore.getState();
      s.closeGroup(s.activeGroupId);
    },
    "nav.back": () => useNavHistory.getState().back(),
    "nav.forward": () => useNavHistory.getState().forward(),
    "view.zen": () => useViewStore.getState().toggleZen(),
    "view.centered": () => useViewStore.getState().toggleCentered(),
    "view.fullscreen": () => toggleFullscreen(),
  };

  setCommandRegistry(handlers);

  useCommandHotkeys(handlers, undefined, {
    "editor.zoomIn": { preventDefault: true, enabled: textEditorActive },
    "editor.zoomOut": { preventDefault: true, enabled: textEditorActive },
    "editor.zoomReset": { preventDefault: true, enabled: textEditorActive },
  });

  return null;
}
