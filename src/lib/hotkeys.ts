import {
  detectPlatform,
  type Hotkey,
  normalizeHotkeyFromEvent,
  type UseHotkeyOptions,
  useHotkeys,
} from "@tanstack/react-hotkeys";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useHotkeyRecording } from "@/lib/hotkey-recording";

export type Command = {
  id: string;
  label: string;
  group: string;
  hotkey: Hotkey;
};

export const COMMANDS: Command[] = [
  {
    id: "command.palette",
    label: "Befehlspalette",
    group: "Allgemein",
    hotkey: "Mod+Shift+P",
  },
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
    id: "terminal.toggle",
    label: "Terminal ein-/ausblenden",
    group: "Allgemein",
    hotkey: "Mod+J",
  },
  {
    id: "browser.toggle",
    label: "Browser ein-/ausblenden",
    group: "Allgemein",
    hotkey: "Mod+Shift+B",
  },
  {
    id: "chat.toggle",
    label: "KI-Chat ein-/ausblenden",
    group: "Allgemein",
    hotkey: "Mod+L",
  },
  {
    id: "search.structural",
    label: "Strukturelle Suche (Code-Muster mit $-Wildcards)",
    group: "Allgemein",
    hotkey: "Mod+Shift+S",
  },
  {
    id: "project.graph",
    label: "Projekt-Graph öffnen (Modul-Abhängigkeiten)",
    group: "Navigation",
    hotkey: "Mod+Alt+G",
  },
  {
    id: "file.deps",
    label: "Datei-Abhängigkeiten anzeigen (Imports & Importer)",
    group: "Navigation",
    hotkey: "Mod+Alt+I",
  },
  {
    id: "debug.file",
    label: "Debugger: Aktive Datei debuggen (node --inspect-brk)",
    group: "Debug",
    hotkey: "Mod+Alt+B",
  },
  {
    id: "debug.attach",
    label: "Debugger: Mit Node verbinden (Port 9229)",
    group: "Debug",
    hotkey: "Mod+Alt+D",
  },
  {
    id: "workspace.settings",
    label: "Workspace-Einstellungen (JSON) öffnen",
    group: "Allgemein",
    hotkey: "Mod+Alt+,",
  },
  {
    id: "project.notes",
    label: "Projekt-Notizen öffnen",
    group: "Allgemein",
    hotkey: "Mod+Alt+N",
  },
  {
    id: "explorer.heatmap",
    label: "Explorer: Änderungs-Heatmap umschalten",
    group: "Ansicht",
    hotkey: "Mod+Alt+M",
  },
  {
    id: "workspace.contexts",
    label: "Arbeitskontexte (Tabs & Layout speichern/wechseln)",
    group: "Allgemein",
    hotkey: "Mod+Alt+X",
  },
  {
    id: "clipboard.history",
    label: "Zwischenablage-Verlauf einfügen",
    group: "Bearbeiten",
    hotkey: "Mod+Shift+V",
  },
  {
    id: "view.screencast",
    label: "Screencast-Modus (Tastenanzeige) umschalten",
    group: "Ansicht",
    hotkey: "Mod+Alt+K",
  },
  {
    id: "history.local",
    label: "Timeline: Historie der aktuellen Datei",
    group: "Dateien",
    hotkey: "Mod+Alt+H",
  },
  {
    id: "task.build",
    label: "Build-Task ausführen (npm run build)",
    group: "Tasks",
    hotkey: "Mod+Shift+R",
  },
  {
    id: "task.test",
    label: "Test-Task ausführen (npm test)",
    group: "Tasks",
    hotkey: "Mod+Shift+T",
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
  {
    id: "editor.format",
    label: "Dokument formatieren",
    group: "Editor",
    hotkey: "Shift+Alt+F" as Hotkey,
  },
  {
    id: "editor.zoomIn",
    label: "Schrift vergrößern",
    group: "Editor",
    hotkey: "Mod+=",
  },
  {
    id: "editor.zoomOut",
    label: "Schrift verkleinern",
    group: "Editor",
    hotkey: "Mod+-",
  },
  {
    id: "editor.zoomReset",
    label: "Schriftgröße zurücksetzen",
    group: "Editor",
    hotkey: "Mod+0",
  },
  {
    id: "editor.splitRight",
    label: "Editor rechts teilen",
    group: "Editor",
    hotkey: "Mod+\\",
  },
  {
    id: "editor.splitDown",
    label: "Editor nach unten teilen",
    group: "Editor",
    hotkey: "Mod+Shift+\\" as Hotkey,
  },
  {
    id: "editor.closeGroup",
    label: "Editor-Gruppe schließen",
    group: "Editor",
    hotkey: "Mod+Alt+W",
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
    hotkey: "Mod+Alt+P",
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
  {
    id: "symbol.workspace",
    label: "Symbol im Workspace suchen",
    group: "Allgemein",
    hotkey: "Mod+T",
  },
  {
    id: "search.workspace",
    label: "Im Workspace suchen",
    group: "Allgemein",
    hotkey: "Mod+Shift+F",
  },
  {
    id: "scm.focus",
    label: "Quellcodeverwaltung öffnen",
    group: "Allgemein",
    hotkey: "Mod+Shift+G",
  },
  {
    id: "nav.back",
    label: "Zurück navigieren",
    group: "Navigation",
    hotkey: "Control+-" as Hotkey,
  },
  {
    id: "nav.forward",
    label: "Vorwärts navigieren",
    group: "Navigation",
    hotkey: "Control+Shift+-" as Hotkey,
  },
  {
    id: "view.zen",
    label: "Zen-Modus",
    group: "Ansicht",
    hotkey: "Mod+Alt+Z",
  },
  {
    id: "view.centered",
    label: "Zentriertes Layout",
    group: "Ansicht",
    hotkey: "Mod+Alt+C",
  },
  {
    id: "view.fullscreen",
    label: "Vollbild",
    group: "Ansicht",
    hotkey: "F11" as Hotkey,
  },
  { id: "file.rename", label: "Umbenennen", group: "Dateien", hotkey: "F2" },
  {
    id: "file.delete",
    label: "Löschen",
    group: "Dateien",
    hotkey: "Mod+Backspace",
  },
];

export const COMMAND_HOTKEY_ALTERNATES: Partial<Record<string, Hotkey[]>> = {
  "editor.zoomIn": ["Mod+Shift+=" as Hotkey],
  "command.palette": ["F1" as Hotkey],
};

export const NUMPAD_ADD_HOTKEY = "Mod+NumpadAdd";

const ZOOM_IN_NUMPAD_BINDINGS = new Set([
  NUMPAD_ADD_HOTKEY,
  "Control+NumpadAdd",
  "Mod+=",
  "Mod+Shift+=",
]);

const MODIFIER_KEYS = new Set([
  "Control",
  "Shift",
  "Alt",
  "Meta",
  "AltGraph",
  "OS",
]);

function hasMod(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

export function sanitizeRecordedHotkey(hotkey: string): string {
  if (hotkey.endsWith("++") && hotkey !== "Mod++" && hotkey !== "Control++") {
    return `${hotkey.slice(0, -1)}=`;
  }
  return hotkey;
}

export function sanitizeZoomInHotkey(hotkey: string): string {
  if (hotkey === "Mod++" || hotkey === "Control++") {
    return NUMPAD_ADD_HOTKEY;
  }
  return sanitizeRecordedHotkey(hotkey);
}

export function hotkeyFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (event.repeat) return null;
  if (MODIFIER_KEYS.has(event.key)) return null;

  if (
    (event.key === "Backspace" || event.key === "Delete") &&
    !hasMod(event) &&
    !event.shiftKey &&
    !event.altKey
  ) {
    return "";
  }

  if (event.code === "NumpadAdd" && hasMod(event) && !event.altKey) {
    return NUMPAD_ADD_HOTKEY;
  }

  const normalized = normalizeHotkeyFromEvent(event, detectPlatform()) as string;
  if (normalized === "Mod++" || normalized === "Control++") {
    return NUMPAD_ADD_HOTKEY;
  }

  return sanitizeRecordedHotkey(normalized);
}

export function zoomInUsesNumpad(overrides: Record<string, string | null>) {
  const override = overrides["editor.zoomIn"];
  if (override === null) return false;
  if (override === undefined) return true;
  return ZOOM_IN_NUMPAD_BINDINGS.has(sanitizeZoomInHotkey(override));
}

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
  if (override === null) return null;
  if (override === undefined) return command.hotkey;
  if (command.id === "editor.zoomIn") return sanitizeZoomInHotkey(override);
  return sanitizeRecordedHotkey(override);
}

export function useCommandHotkeys(
  handlers: Record<string, () => void>,
  commonOptions?: UseHotkeyOptions,
  optionsById?: Record<string, UseHotkeyOptions>,
) {
  const overrides = useHotkeySettings((s) => s.overrides);
  const isRecording = useHotkeyRecording((s) => s.isRecording);
  useHotkeys(
    COMMANDS.filter((c) => c.id in handlers).flatMap((c) => {
      const binding = effectiveHotkey(c, overrides);
      const primary = (binding ?? c.hotkey) as Hotkey;
      const usesDefault = overrides[c.id] === undefined;
      const hotkeys = [
        primary,
        ...(usesDefault ? (COMMAND_HOTKEY_ALTERNATES[c.id] ?? []) : []),
      ];
      const perId = optionsById?.[c.id];
      const perIdEnabled = perId?.enabled ?? true;
      return hotkeys.map((hotkey) => ({
        hotkey,
        callback: () => handlers[c.id](),
        options: {
          ...perId,
          enabled: binding !== null && !isRecording && perIdEnabled,
        },
      }));
    }),
    commonOptions,
  );
}
