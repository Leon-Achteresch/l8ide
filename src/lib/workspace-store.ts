import {
  collectLeaves,
  type LayoutNode,
  openPreviewTabs,
  removeLeaf,
  type SplitDirection,
  splitLeaf,
} from "@/lib/editor-groups";
import { remap } from "@/lib/fs-move";
import { isPathTrusted } from "@/lib/workspace-trust";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const PAGE_PREFIX = "page:";

export type SidebarMode = "FileTree" | "Search" | "Scm" | "Outline";

export const PAGES: Record<string, string> = {
  "/settings": "Settings",
  "/shortcuts": "Shortcuts",
  "/project-graph": "Projekt-Graph",
  "/dependencies": "Abhängigkeiten",
  "/processes": "Dev-Prozesse",
  "/design-tokens": "Design-Tokens",
  "/git-history": "Verlauf",
  "/git-sync": "Ein-/Ausgehend",
  "/tests": "Tests",
  "/welcome": "Willkommen",
  "/insights": "Repo-Insights",
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

export type HiddenScope = "global" | "workspace";

export type GroupState = {
  tabs: string[];
  pinned: string[];
  activeFile: string | null;
  preview: string | null;
};

type WorkspaceStore = {
  rootPath: string | null;
  recentFolders: string[];
  trustedFolders: string[];
  trustFolder: (path: string) => void;
  revokeTrust: (path: string) => void;
  sidebarWidth: number;
  sidebarOpen: boolean;
  fileIcons: boolean;
  setFileIcons: (enabled: boolean) => void;
  tabIcons: boolean;
  setTabIcons: (enabled: boolean) => void;
  autoSave: boolean;
  setAutoSave: (enabled: boolean) => void;
  autoSaveDelay: number;
  setAutoSaveDelay: (ms: number) => void;
  hiddenNames: string[];
  workspaceHidden: Record<string, string[]>;
  hideIgnored: boolean;
  toggleHideIgnored: () => void;
  hideName: (name: string, scope: HiddenScope) => void;
  unhideName: (name: string, scope: HiddenScope) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  activeFile: string | null;
  tabs: string[];
  pinned: string[];
  groups: Record<string, GroupState>;
  layout: LayoutNode;
  activeGroupId: string;
  nextId: number;
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;
  setRootPath: (path: string | null) => void;
  openFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  closeTab: (path: string) => void;
  closeOthers: (path: string) => void;
  closeToRight: (path: string) => void;
  closeAll: () => void;
  togglePin: (path: string) => void;
  openPreview: (path: string) => void;
  promoteTab: (path: string) => void;
  moveTab: (path: string, toIndex: number) => void;
  remapPath: (src: string, dest: string) => void;
  splitGroup: (direction: SplitDirection) => void;
  focusGroup: (id: string) => void;
  closeGroup: (id: string) => void;
  moveTabToGroup: (
    path: string,
    fromId: string,
    toId: string,
    toIndex: number,
  ) => void;
};

function move(arr: string[], path: string, to: number) {
  const next = arr.filter((t) => t !== path);
  next.splice(to, 0, path);
  return next;
}

// The active group's state is mirrored onto the top-level tabs/pinned/activeFile
// so every existing consumer keeps working; withGroupSync writes both.
function withGroupSync(s: WorkspaceStore, patch: Partial<GroupState>) {
  const tabs = patch.tabs ?? s.tabs;
  const pinned = patch.pinned ?? s.pinned;
  const activeFile = "activeFile" in patch ? patch.activeFile ?? null : s.activeFile;
  const current = s.groups[s.activeGroupId];
  let preview =
    "preview" in patch ? patch.preview ?? null : current?.preview ?? null;
  if (preview && !tabs.includes(preview)) preview = null;
  return {
    tabs,
    pinned,
    activeFile,
    groups: { ...s.groups, [s.activeGroupId]: { tabs, pinned, activeFile, preview } },
  };
}

function loadGroup(g: GroupState) {
  return { tabs: g.tabs, pinned: g.pinned, activeFile: g.activeFile };
}

function freshGroups() {
  const group: GroupState = { tabs: [], pinned: [], activeFile: null, preview: null };
  return {
    groups: { g0: group },
    layout: { type: "leaf", id: "g0" } as LayoutNode,
    activeGroupId: "g0",
    nextId: 1,
    ...loadGroup(group),
  };
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      rootPath: null,
      recentFolders: [],
      trustedFolders: [],
      trustFolder: (path) =>
        set((s) =>
          s.trustedFolders.includes(path)
            ? s
            : { trustedFolders: [...s.trustedFolders, path] },
        ),
      revokeTrust: (path) =>
        set((s) => ({
          trustedFolders: s.trustedFolders.filter((p) => p !== path),
        })),
      sidebarWidth: 256,
      sidebarOpen: true,
      fileIcons: true,
      setFileIcons: (enabled) => set({ fileIcons: enabled }),
      tabIcons: true,
      setTabIcons: (enabled) => set({ tabIcons: enabled }),
      autoSave: false,
      setAutoSave: (enabled) => set({ autoSave: enabled }),
      autoSaveDelay: 1000,
      setAutoSaveDelay: (ms) =>
        set({ autoSaveDelay: Math.max(200, Math.min(10000, ms)) }),
      hiddenNames: [".git"],
      workspaceHidden: {},
      hideIgnored: false,
      toggleHideIgnored: () => set((s) => ({ hideIgnored: !s.hideIgnored })),
      hideName: (name, scope) =>
        set((s) => {
          if (scope === "global") {
            return s.hiddenNames.includes(name)
              ? s
              : { hiddenNames: [...s.hiddenNames, name] };
          }
          if (!s.rootPath) return s;
          const list = s.workspaceHidden[s.rootPath] ?? [];
          return list.includes(name)
            ? s
            : {
                workspaceHidden: {
                  ...s.workspaceHidden,
                  [s.rootPath]: [...list, name],
                },
              };
        }),
      unhideName: (name, scope) =>
        set((s) => {
          if (scope === "global") {
            return { hiddenNames: s.hiddenNames.filter((n) => n !== name) };
          }
          if (!s.rootPath) return s;
          return {
            workspaceHidden: {
              ...s.workspaceHidden,
              [s.rootPath]: (s.workspaceHidden[s.rootPath] ?? []).filter(
                (n) => n !== name,
              ),
            },
          };
        }),
      setSidebarWidth: (width) =>
        set({ sidebarWidth: Math.max(160, Math.min(600, width)) }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      activeFile: null,
      tabs: [],
      pinned: [],
      groups: { g0: { tabs: [], pinned: [], activeFile: null, preview: null } },
      layout: { type: "leaf", id: "g0" },
      activeGroupId: "g0",
      nextId: 1,
      sidebarMode: "FileTree",
      setSidebarMode: (mode) => set({ sidebarMode: mode }),
      setRootPath: (path) =>
        set((s) => ({
          rootPath: path,
          recentFolders: path
            ? [path, ...s.recentFolders.filter((p) => p !== path)].slice(0, 8)
            : s.recentFolders,
          ...freshGroups(),
        })),
      openFile: (path) =>
        set((s) =>
          withGroupSync(s, {
            activeFile: path,
            tabs: s.tabs.includes(path) ? s.tabs : [...s.tabs, path],
            ...(s.groups[s.activeGroupId]?.preview === path
              ? { preview: null }
              : {}),
          }),
        ),
      openPreview: (path) =>
        set((s) => {
          if (s.tabs.includes(path)) {
            return withGroupSync(s, { activeFile: path });
          }
          return withGroupSync(s, {
            tabs: openPreviewTabs(
              s.tabs,
              s.pinned,
              s.groups[s.activeGroupId]?.preview ?? null,
              path,
            ),
            activeFile: path,
            preview: path,
          });
        }),
      promoteTab: (path) =>
        set((s) =>
          s.groups[s.activeGroupId]?.preview === path
            ? withGroupSync(s, { preview: null })
            : s,
        ),
      setActiveFile: (path) => set((s) => withGroupSync(s, { activeFile: path })),
      closeTab: (path) =>
        set((s) => {
          const i = s.tabs.indexOf(path);
          const tabs = s.tabs.filter((t) => t !== path);
          const pinned = s.pinned.filter((t) => t !== path);
          const activeFile =
            s.activeFile === path
              ? (tabs[Math.min(i, tabs.length - 1)] ?? null)
              : s.activeFile;
          if (tabs.length === 0 && collectLeaves(s.layout).length > 1) {
            return closeActiveGroup(s);
          }
          return withGroupSync(s, { tabs, pinned, activeFile });
        }),
      closeOthers: (path) =>
        set((s) =>
          withGroupSync(s, {
            tabs: s.tabs.filter((t) => t === path || s.pinned.includes(t)),
            activeFile: path,
          }),
        ),
      closeToRight: (path) =>
        set((s) => {
          const i = s.tabs.indexOf(path);
          const tabs = s.tabs.filter((t, ti) => ti <= i || s.pinned.includes(t));
          return withGroupSync(s, {
            tabs,
            activeFile:
              s.activeFile && tabs.includes(s.activeFile) ? s.activeFile : path,
          });
        }),
      closeAll: () =>
        set((s) => {
          const tabs = s.tabs.filter((t) => s.pinned.includes(t));
          return withGroupSync(s, {
            tabs,
            activeFile:
              s.activeFile && tabs.includes(s.activeFile)
                ? s.activeFile
                : (tabs[tabs.length - 1] ?? null),
          });
        }),
      togglePin: (path) =>
        set((s) => {
          const isPinned = s.pinned.includes(path);
          const pinned = isPinned
            ? s.pinned.filter((t) => t !== path)
            : [...s.pinned, path];
          const to = isPinned ? pinned.length : pinned.length - 1;
          return withGroupSync(s, {
            pinned,
            tabs: move(s.tabs, path, to),
            ...(s.groups[s.activeGroupId]?.preview === path
              ? { preview: null }
              : {}),
          });
        }),
      moveTab: (path, toIndex) =>
        set((s) => {
          const isPinned = s.pinned.includes(path);
          const min = isPinned ? 0 : s.pinned.length;
          const max = isPinned ? s.pinned.length - 1 : s.tabs.length - 1;
          return withGroupSync(s, {
            tabs: move(s.tabs, path, Math.max(min, Math.min(max, toIndex))),
          });
        }),
      remapPath: (src, dest) =>
        set((s) => {
          const map = remap(src, dest);
          const groups: Record<string, GroupState> = {};
          for (const [id, g] of Object.entries(s.groups)) {
            groups[id] = {
              tabs: g.tabs.map(map),
              pinned: g.pinned.map(map),
              activeFile: g.activeFile ? map(g.activeFile) : null,
              preview: g.preview ? map(g.preview) : null,
            };
          }
          return {
            groups,
            tabs: s.tabs.map(map),
            pinned: s.pinned.map(map),
            activeFile: s.activeFile ? map(s.activeFile) : null,
          };
        }),
      splitGroup: (direction) =>
        set((s) => {
          const leafId = `g${s.nextId}`;
          const splitId = `s${s.nextId + 1}`;
          const state: GroupState = {
            tabs: s.activeFile ? [s.activeFile] : [],
            pinned: [],
            activeFile: s.activeFile,
            preview: null,
          };
          return {
            nextId: s.nextId + 2,
            groups: { ...s.groups, [leafId]: state },
            layout: splitLeaf(
              s.layout,
              s.activeGroupId,
              leafId,
              splitId,
              direction,
            ),
            activeGroupId: leafId,
            ...loadGroup(state),
          };
        }),
      focusGroup: (id) =>
        set((s) => {
          const g = s.groups[id];
          if (id === s.activeGroupId || !g) return s;
          return { activeGroupId: id, ...loadGroup(g) };
        }),
      closeGroup: (id) =>
        set((s) => {
          if (collectLeaves(s.layout).length <= 1) return s;
          const layout = removeLeaf(s.layout, id);
          const groups = { ...s.groups };
          delete groups[id];
          if (id !== s.activeGroupId) return { layout, groups };
          const nextId = collectLeaves(layout)[0];
          return {
            layout,
            groups,
            activeGroupId: nextId,
            ...loadGroup(groups[nextId]),
          };
        }),
      moveTabToGroup: (path, fromId, toId, toIndex) =>
        set((s) => {
          const from = s.groups[fromId];
          const to = s.groups[toId];
          if (!from || !to || fromId === toId) return s;
          const fi = from.tabs.indexOf(path);
          const fromTabs = from.tabs.filter((t) => t !== path);
          const fromPinned = from.pinned.filter((t) => t !== path);
          const fromActive =
            from.activeFile === path
              ? (fromTabs[Math.min(fi, fromTabs.length - 1)] ?? null)
              : from.activeFile;
          const insertAt = Math.max(
            to.pinned.length,
            Math.min(toIndex, to.tabs.length),
          );
          const toTabs = to.tabs.includes(path)
            ? to.tabs
            : [...to.tabs.slice(0, insertAt), path, ...to.tabs.slice(insertAt)];
          const target: GroupState = {
            tabs: toTabs,
            pinned: to.pinned,
            activeFile: path,
            preview: to.preview === path ? null : to.preview,
          };
          const groups = { ...s.groups, [toId]: target };
          let layout = s.layout;
          if (fromTabs.length === 0 && collectLeaves(s.layout).length > 1) {
            delete groups[fromId];
            layout = removeLeaf(s.layout, fromId);
          } else {
            groups[fromId] = {
              tabs: fromTabs,
              pinned: fromPinned,
              activeFile: fromActive,
              preview: from.preview === path ? null : from.preview,
            };
          }
          return {
            groups,
            layout,
            activeGroupId: toId,
            ...loadGroup(target),
          };
        }),
    }),
    {
      name: "workspace-store",
      version: 3,
      migrate: (persisted) => {
        const s = persisted as Partial<WorkspaceStore>;
        const tabs = s.tabs ?? (s.activeFile ? [s.activeFile] : []);
        const pinned = s.pinned ?? [];
        const activeFile = s.activeFile ?? null;
        const base = {
          ...s,
          tabs,
          pinned,
          activeFile,
          hiddenNames: s.hiddenNames ?? [".git"],
          workspaceHidden: s.workspaceHidden ?? {},
          recentFolders: s.recentFolders ?? [],
          trustedFolders: s.trustedFolders ?? [],
        };
        if (s.groups && s.layout && s.activeGroupId) {
          const groups: Record<string, GroupState> = {};
          for (const [id, g] of Object.entries(s.groups)) {
            groups[id] = { ...g, preview: g.preview ?? null };
          }
          return { ...base, groups, nextId: s.nextId ?? 1 };
        }
        return {
          ...base,
          groups: { g0: { tabs, pinned, activeFile, preview: null } },
          layout: { type: "leaf", id: "g0" },
          activeGroupId: "g0",
          nextId: 1,
        };
      },
    },
  ),
);

export function useIsWorkspaceTrusted() {
  return useWorkspaceStore((s) => isPathTrusted(s.trustedFolders, s.rootPath));
}

function closeActiveGroup(s: WorkspaceStore) {
  const layout = removeLeaf(s.layout, s.activeGroupId);
  const groups = { ...s.groups };
  delete groups[s.activeGroupId];
  const nextId = collectLeaves(layout)[0];
  return {
    layout,
    groups,
    activeGroupId: nextId,
    ...loadGroup(groups[nextId]),
  };
}
