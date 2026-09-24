"use client";

import { useEffect, useMemo, useState } from "react";
import { File, Star } from "lucide-react";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { create } from "zustand";
import {
  CommandPalette as MotionCommandPalette,
  type CommandItem,
} from "@/components/motion/command-palette";
import {
  COMMANDS,
  effectiveHotkey,
  NUMPAD_ADD_HOTKEY,
  useHotkeySettings,
} from "@/lib/hotkeys";
import { runCommand, topCommands } from "@/lib/command-registry";
import { runEditorAction } from "@/lib/editor-actions";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useFileIndexStore } from "@/lib/file-index";
import { suggestFiles, recordFileChoice, recordFileQuery } from "@/lib/file-suggestions";
import { fileIcon } from "@/lib/file-icons";

export const useCommandPalette = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

const EDITOR_ACTIONS: { id: string; label: string }[] = [
  { id: "editor.action.gotoLine", label: "Gehe zu Zeile/Spalte" },
  { id: "editor.action.quickOutline", label: "Symbol in Datei suchen" },
  { id: "editor.action.goToImplementation", label: "Zur Implementierung springen" },
  { id: "editor.action.referenceSearch.trigger", label: "Alle Referenzen suchen" },
  { id: "editor.action.transformToUppercase", label: "In GROSSBUCHSTABEN umwandeln" },
  { id: "editor.action.transformToLowercase", label: "In kleinbuchstaben umwandeln" },
  { id: "editor.action.transformToTitlecase", label: "In Title Case umwandeln" },
  { id: "editor.action.transformToSnakecase", label: "In snake_case umwandeln" },
  { id: "editor.action.transformToKebabcase", label: "In kebab-case umwandeln" },
  { id: "editor.action.sortLinesAscending", label: "Zeilen aufsteigend sortieren" },
  { id: "editor.action.sortLinesDescending", label: "Zeilen absteigend sortieren" },
  { id: "editor.action.trimTrailingWhitespace", label: "Nachgestellte Leerzeichen entfernen" },
];

function displayHotkey(binding: string) {
  if (binding === NUMPAD_ADD_HOTKEY) return `${formatForDisplay("Mod+=")} (Num)`;
  return formatForDisplay(binding);
}

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const overrides = useHotkeySettings((s) => s.overrides);
  const [query, setQuery] = useState("");
  const root = useWorkspaceStore((s) => s.rootPath);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const pinned = useWorkspaceStore((s) => s.pinned);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const hiddenNames = useWorkspaceStore((s) => s.hiddenNames);
  const workspaceHidden = useWorkspaceStore((s) => s.workspaceHidden);
  const files = useFileIndexStore((s) => s.files);
  const indexedRoot = useFileIndexStore((s) => s.rootPath);
  const ensureIndex = useFileIndexStore((s) => s.ensureIndex);

  useEffect(() => {
    if (open && root) ensureIndex(root, hiddenNames, workspaceHidden[root] ?? []);
  }, [open, root, hiddenNames, workspaceHidden, ensureIndex]);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const timer = setTimeout(() => recordFileQuery(root, query), 900);
    return () => clearTimeout(timer);
  }, [open, root, query]);

  const fileItems = useMemo<CommandItem[]>(() => {
    if (!open || !root || indexedRoot !== root) return [];
    return suggestFiles(files, query, { root, tabs, pinned, activeFile, limit: query.trim() ? 16 : 6 })
      .map((path) => {
        const name = path.slice(path.lastIndexOf("/") + 1);
        return {
          id: `file:${path}`,
          label: name,
          description: path.slice(root.length).replace(/^\//, "") || path,
          group: query.trim() ? "Dateien" : "Für dich",
          icon: fileIcon(name) ?? File,
          onSelect: () => {
            recordFileChoice(root, path, query);
            useWorkspaceStore.getState().openFile(path);
          },
        };
      });
  }, [open, root, indexedRoot, files, query, tabs, pinned, activeFile]);

  const items = useMemo<CommandItem[]>(() => [
    ...COMMANDS.filter((command) => command.id !== "command.palette").map((command) => {
      const binding = effectiveHotkey(command, overrides);
      return {
        id: command.id,
        label: command.label,
        group: command.group,
        hint: binding ? displayHotkey(binding) : undefined,
        onSelect: () => runCommand(command.id),
      };
    }),
    ...EDITOR_ACTIONS.map((action) => ({
      id: action.id,
      label: action.label,
      group: "Editor-Aktionen",
      onSelect: () => requestAnimationFrame(() => runEditorAction(action.id)),
    })),
  ], [overrides]);

  const featuredItems = useMemo<CommandItem[]>(() => {
    if (!open) return [];
    return topCommands(5)
      .map((id) => COMMANDS.find((command) => command.id === id))
      .filter((command): command is (typeof COMMANDS)[number] => Boolean(command) && command!.id !== "command.palette")
      .map((command) => {
        const binding = effectiveHotkey(command, overrides);
        return {
          id: `freq:${command.id}`,
          label: command.label,
          group: "Häufig genutzt",
          icon: Star,
          hint: binding ? displayHotkey(binding) : undefined,
          onSelect: () => runCommand(command.id),
        };
      });
  }, [open, overrides]);

  return (
    <MotionCommandPalette
      items={items}
      featuredItems={[...fileItems, ...featuredItems]}
      searchItems={query.trim() ? fileItems : []}
      onQueryChange={setQuery}
      shortcut={null}
      placeholder="Datei, Befehl oder Aktion suchen…"
      emptyMessage="Keine Ergebnisse"
      open={open}
      onOpenChange={setOpen}
    />
  );
}
