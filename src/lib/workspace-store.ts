import { create } from "zustand";
import { persist } from "zustand/middleware";

const PAGE_PREFIX = "page:";

export const PAGES: Record<string, string> = {
  "/settings": "Settings",
};

export function isPageTab(tab: string) {
  return tab.startsWith(PAGE_PREFIX);
}

export function pageRoute(tab: string) {
  return tab.slice(PAGE_PREFIX.length);
}

export function pageTab(route: string) {
  return `${PAGE_PREFIX}${route}`;
}

type WorkspaceStore = {
  rootPath: string | null;
  sidebarWidth: number;
  sidebarOpen: boolean;
  fileIcons: boolean;
  setFileIcons: (enabled: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  activeFile: string | null;
  tabs: string[];
  pinned: string[];
  setRootPath: (path: string | null) => void;
  openFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  closeTab: (path: string) => void;
  closeOthers: (path: string) => void;
  closeToRight: (path: string) => void;
  closeAll: () => void;
  togglePin: (path: string) => void;
  moveTab: (path: string, toIndex: number) => void;
};

function move(arr: string[], path: string, to: number) {
  const next = arr.filter((t) => t !== path);
  next.splice(to, 0, path);
  return next;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      rootPath: null,
      sidebarWidth: 256,
      sidebarOpen: true,
      fileIcons: true,
      setFileIcons: (enabled) => set({ fileIcons: enabled }),
      setSidebarWidth: (width) =>
        set({ sidebarWidth: Math.max(160, Math.min(600, width)) }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      activeFile: null,
      tabs: [],
      pinned: [],
      setRootPath: (path) =>
        set({ rootPath: path, activeFile: null, tabs: [], pinned: [] }),
      openFile: (path) =>
        set((s) => ({
          activeFile: path,
          tabs: s.tabs.includes(path) ? s.tabs : [...s.tabs, path],
        })),
      setActiveFile: (path) => set({ activeFile: path }),
      closeTab: (path) =>
        set((s) => {
          const i = s.tabs.indexOf(path);
          const tabs = s.tabs.filter((t) => t !== path);
          return {
            tabs,
            pinned: s.pinned.filter((t) => t !== path),
            activeFile:
              s.activeFile === path
                ? (tabs[Math.min(i, tabs.length - 1)] ?? null)
                : s.activeFile,
          };
        }),
      closeOthers: (path) =>
        set((s) => ({
          tabs: s.tabs.filter((t) => t === path || s.pinned.includes(t)),
          activeFile: path,
        })),
      closeToRight: (path) =>
        set((s) => {
          const i = s.tabs.indexOf(path);
          const tabs = s.tabs.filter(
            (t, ti) => ti <= i || s.pinned.includes(t),
          );
          return {
            tabs,
            activeFile:
              s.activeFile && tabs.includes(s.activeFile)
                ? s.activeFile
                : path,
          };
        }),
      closeAll: () =>
        set((s) => {
          const tabs = s.tabs.filter((t) => s.pinned.includes(t));
          return {
            tabs,
            activeFile:
              s.activeFile && tabs.includes(s.activeFile)
                ? s.activeFile
                : (tabs[tabs.length - 1] ?? null),
          };
        }),
      togglePin: (path) =>
        set((s) => {
          const isPinned = s.pinned.includes(path);
          const pinned = isPinned
            ? s.pinned.filter((t) => t !== path)
            : [...s.pinned, path];
          const to = isPinned ? pinned.length : pinned.length - 1;
          return { pinned, tabs: move(s.tabs, path, to) };
        }),
      moveTab: (path, toIndex) =>
        set((s) => {
          const isPinned = s.pinned.includes(path);
          const min = isPinned ? 0 : s.pinned.length;
          const max = isPinned ? s.pinned.length - 1 : s.tabs.length - 1;
          return {
            tabs: move(s.tabs, path, Math.max(min, Math.min(max, toIndex))),
          };
        }),
    }),
    {
      name: "workspace-store",
      version: 1,
      migrate: (persisted) => {
        const s = persisted as Partial<WorkspaceStore>;
        return {
          ...s,
          tabs: s.tabs ?? (s.activeFile ? [s.activeFile] : []),
          pinned: s.pinned ?? [],
        };
      },
    },
  ),
);
