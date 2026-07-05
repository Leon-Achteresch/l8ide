import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Profile = {
  id: string;
  label: string;
  path?: string;
  args?: string[];
  env?: Record<string, string>;
  custom?: boolean;
};

export type Pane = {
  id: number;
  ptyId: number | null;
  title: string;
  profileId: string;
  cwd: string | null;
};

export type Group = { id: number; panes: number[] };

type TerminalStore = {
  open: boolean;
  height: number;
  groups: Group[];
  panes: Record<number, Pane>;
  activeGroup: number | null;
  activePane: number | null;
  nextId: number;
  defaultProfileId: string | null;
  customProfiles: Profile[];
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setHeight: (height: number) => void;
  addGroup: (profileId?: string) => void;
  splitActive: (profileId?: string) => void;
  closePane: (id: number) => void;
  closeGroup: (id: number) => void;
  setActiveGroup: (id: number) => void;
  setActivePane: (id: number) => void;
  setTitle: (id: number, title: string) => void;
  setCwd: (id: number, cwd: string | null) => void;
  setPtyId: (id: number, ptyId: number | null) => void;
  setDefaultProfile: (id: string) => void;
  addCustomProfile: (p: Omit<Profile, "id" | "custom">) => void;
  removeCustomProfile: (id: string) => void;
};

function groupOf(groups: Group[], paneId: number) {
  return groups.find((g) => g.panes.includes(paneId));
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set) => ({
      open: false,
      height: 280,
      groups: [],
      panes: {},
      activeGroup: null,
      activePane: null,
      nextId: 1,
      defaultProfileId: null,
      customProfiles: [],

      toggle: () =>
        set((s) => {
          const open = !s.open;
          if (open && s.groups.length === 0) return { ...spawnGroup(s), open };
          return { open };
        }),
      setOpen: (open) => set({ open }),
      setHeight: (height) =>
        set({ height: Math.max(80, Math.min(window.innerHeight - 160, height)) }),

      addGroup: (profileId) =>
        set((s) => ({ ...spawnGroup(s, profileId), open: true })),

      splitActive: (profileId) =>
        set((s) => {
          if (s.activeGroup == null) return spawnGroup(s, profileId);
          const id = s.nextId;
          const groups = s.groups.map((g) =>
            g.id === s.activeGroup ? { ...g, panes: [...g.panes, id] } : g,
          );
          return {
            groups,
            panes: { ...s.panes, [id]: newPane(id, s, profileId) },
            activePane: id,
            nextId: id + 1,
            open: true,
          };
        }),

      closePane: (id) =>
        set((s) => {
          const group = groupOf(s.groups, id);
          if (!group) return s;
          const remaining = group.panes.filter((p) => p !== id);
          const { [id]: _, ...panes } = s.panes;
          if (remaining.length === 0) return removeGroup(s, group.id, panes);
          const groups = s.groups.map((g) =>
            g.id === group.id ? { ...g, panes: remaining } : g,
          );
          return {
            groups,
            panes,
            activePane: s.activePane === id ? remaining[0] : s.activePane,
          };
        }),

      closeGroup: (id) =>
        set((s) => {
          const group = s.groups.find((g) => g.id === id);
          if (!group) return s;
          const panes = { ...s.panes };
          for (const p of group.panes) delete panes[p];
          return removeGroup(s, id, panes);
        }),

      setActiveGroup: (id) =>
        set((s) => {
          const group = s.groups.find((g) => g.id === id);
          return group
            ? { activeGroup: id, activePane: group.panes[0] ?? null }
            : s;
        }),
      setActivePane: (id) =>
        set((s) => {
          const group = groupOf(s.groups, id);
          return group ? { activePane: id, activeGroup: group.id } : s;
        }),

      setTitle: (id, title) =>
        set((s) =>
          !s.panes[id] || s.panes[id].title === title
            ? s
            : { panes: { ...s.panes, [id]: { ...s.panes[id], title } } },
        ),
      setCwd: (id, cwd) =>
        set((s) =>
          !s.panes[id] || s.panes[id].cwd === cwd
            ? s
            : { panes: { ...s.panes, [id]: { ...s.panes[id], cwd } } },
        ),
      setPtyId: (id, ptyId) =>
        set((s) =>
          !s.panes[id]
            ? s
            : { panes: { ...s.panes, [id]: { ...s.panes[id], ptyId } } },
        ),

      setDefaultProfile: (id) => set({ defaultProfileId: id }),
      addCustomProfile: (p) =>
        set((s) => {
          const id = `custom:${s.nextId}`;
          return {
            customProfiles: [...s.customProfiles, { ...p, id, custom: true }],
            nextId: s.nextId + 1,
          };
        }),
      removeCustomProfile: (id) =>
        set((s) => ({
          customProfiles: s.customProfiles.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "terminal-store",
      partialize: (s) => ({
        open: s.open,
        height: s.height,
        groups: s.groups,
        panes: s.panes,
        activeGroup: s.activeGroup,
        activePane: s.activePane,
        nextId: s.nextId,
        defaultProfileId: s.defaultProfileId,
        customProfiles: s.customProfiles,
      }),
    },
  ),
);

function newPane(
  id: number,
  s: { defaultProfileId: string | null },
  profileId?: string,
): Pane {
  return {
    id,
    ptyId: null,
    title: "shell",
    profileId: profileId ?? s.defaultProfileId ?? "default",
    cwd: null,
  };
}

function spawnGroup(
  s: TerminalStore,
  profileId?: string,
): Partial<TerminalStore> {
  const id = s.nextId;
  return {
    groups: [...s.groups, { id, panes: [id] }],
    panes: { ...s.panes, [id]: newPane(id, s, profileId) },
    activeGroup: id,
    activePane: id,
    nextId: id + 1,
  };
}

function removeGroup(
  s: TerminalStore,
  id: number,
  panes: Record<number, Pane>,
): Partial<TerminalStore> {
  const idx = s.groups.findIndex((g) => g.id === id);
  const groups = s.groups.filter((g) => g.id !== id);
  const nextActive =
    s.activeGroup === id
      ? (groups[Math.min(idx, groups.length - 1)]?.id ?? null)
      : s.activeGroup;
  const activeGroupObj = groups.find((g) => g.id === nextActive);
  return {
    groups,
    panes,
    activeGroup: nextActive,
    activePane:
      s.activeGroup === id ? (activeGroupObj?.panes[0] ?? null) : s.activePane,
    open: groups.length > 0 ? s.open : false,
  };
}
