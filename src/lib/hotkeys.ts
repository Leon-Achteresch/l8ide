import {
  type Hotkey,
  type UseHotkeyOptions,
  useHotkeys,
} from "@tanstack/react-hotkeys";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Command = {
  id: string;
  label: string;
  group: string;
  hotkey: Hotkey;
};

export const COMMANDS: Command[] = [
  {
    id: "sidebar.toggle",
    label: "Sidebar ein-/ausblenden",
    group: "Allgemein",
    hotkey: "Mod+B",
  },
  {
    id: "folder.open",
    label: "Ordner öffnen",
    group: "Allgemein",
    hotkey: "Mod+O",
  },
  {
    id: "settings.open",
    label: "Einstellungen öffnen",
    group: "Allgemein",
    hotkey: "Mod+,",
  },
  {
    id: "shortcuts.open",
    label: "Tastaturkürzel öffnen",
    group: "Allgemein",
    hotkey: "Mod+/",
  },
  {
    id: "theme.toggle",
    label: "Dark Mode umschalten",
    group: "Allgemein",
    hotkey: "Mod+Shift+D",
  },
  {
    id: "editor.save",
    label: "Datei speichern",
    group: "Editor",
    hotkey: "Mod+S",
  },
  { id: "tab.close", label: "Tab schließen", group: "Tabs", hotkey: "Mod+W" },
  {
    id: "tab.closeAll",
    label: "Alle Tabs schließen",
    group: "Tabs",
    hotkey: "Mod+Shift+W",
  },
  {
    id: "tab.pin",
    label: "Tab anpinnen/lösen",
    group: "Tabs",
    hotkey: "Mod+Shift+P",
  },
  {
    id: "tab.next",
    label: "Nächster Tab",
    group: "Tabs",
    hotkey: "Control+Tab",
  },
  {
    id: "tab.prev",
    label: "Vorheriger Tab",
    group: "Tabs",
    hotkey: "Control+Shift+Tab",
  },
  ...Array.from({ length: 9 }, (_, i): Command => {
    const n = i + 1;
    return {
      id: `tab.goto${n}`,
      label: `Tab ${n} aktivieren`,
      group: "Tabs",
      hotkey: `Mod+${n}` as Hotkey,
    };
  }),
  {
    id: "file.search",
    label: "Dateisuche öffnen",
    group: "Allgemein",
    hotkey: "Mod+P",
  },
  { id: "file.rename", label: "Umbenennen", group: "Dateien", hotkey: "F2" },
  {
    id: "file.delete",
    label: "Löschen",
    group: "Dateien",
    hotkey: "Mod+Backspace",
  },
];

type HotkeySettings = {
  overrides: Record<string, string | null>;
  setOverride: (id: string, hotkey: string | null) => void;
  resetOverride: (id: string) => void;
  resetAll: () => void;
};

export const useHotkeySettings = create<HotkeySettings>()(
  persist(
    (set) => ({
      overrides: {},
      setOverride: (id, hotkey) =>
        set((s) => ({ overrides: { ...s.overrides, [id]: hotkey } })),
      resetOverride: (id) =>
        set((s) => {
          const overrides = { ...s.overrides };
          delete overrides[id];
          return { overrides };
        }),
      resetAll: () => set({ overrides: {} }),
    }),
    { name: "hotkey-overrides" },
  ),
);

export function effectiveHotkey(
  command: Command,
  overrides: Record<string, string | null>,
): string | null {
  const override = overrides[command.id];
  return override === undefined ? command.hotkey : override;
}

export function useCommandHotkeys(
  handlers: Record<string, () => void>,
  commonOptions?: UseHotkeyOptions,
) {
  const overrides = useHotkeySettings((s) => s.overrides);
  useHotkeys(
    COMMANDS.filter((c) => c.id in handlers).map((c) => {
      const binding = effectiveHotkey(c, overrides);
      return {
        hotkey: (binding ?? c.hotkey) as Hotkey,
        callback: () => handlers[c.id](),
        options: { enabled: binding !== null },
      };
    }),
    commonOptions,
  );
}
