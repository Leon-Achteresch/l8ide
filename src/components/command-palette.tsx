"use client";

import { useEffect } from "react";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { create } from "zustand";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import {
  COMMANDS,
  effectiveHotkey,
  NUMPAD_ADD_HOTKEY,
  useHotkeySettings,
} from "@/lib/hotkeys";
import { runCommand } from "@/lib/command-registry";
import { runEditorAction } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";

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
  {
    id: "editor.action.referenceSearch.trigger",
    label: "Alle Referenzen suchen",
  },
  { id: "editor.action.transformToUppercase", label: "In GROSSBUCHSTABEN umwandeln" },
  { id: "editor.action.transformToLowercase", label: "In kleinbuchstaben umwandeln" },
  { id: "editor.action.transformToTitlecase", label: "In Title Case umwandeln" },
  { id: "editor.action.transformToSnakecase", label: "In snake_case umwandeln" },
  { id: "editor.action.transformToKebabcase", label: "In kebab-case umwandeln" },
  { id: "editor.action.sortLinesAscending", label: "Zeilen aufsteigend sortieren" },
  { id: "editor.action.sortLinesDescending", label: "Zeilen absteigend sortieren" },
  {
    id: "editor.action.trimTrailingWhitespace",
    label: "Nachgestellte Leerzeichen entfernen",
  },
];

const GROUPS = [...new Set(COMMANDS.map((c) => c.group))];

function displayHotkey(binding: string) {
  if (binding === NUMPAD_ADD_HOTKEY) return `${formatForDisplay("Mod+=")} (Num)`;
  return formatForDisplay(binding);
}

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const overrides = useHotkeySettings((s) => s.overrides);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <>
      <div
        data-overlay
        className="fixed inset-0 z-40"
        onMouseDown={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-10 z-50 flex justify-center px-4",
          "animate-in fade-in-0 slide-in-from-top-1 duration-100",
        )}
      >
        <div
          className="w-full max-w-2xl overflow-hidden rounded-b-lg border-b bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command loop>
            <CommandInput placeholder="Befehl eingeben…" autoFocus />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">Keine Ergebnisse</span>
              </CommandEmpty>
              {GROUPS.map((group) => (
                <CommandGroup key={group} heading={group}>
                  {COMMANDS.filter(
                    (c) => c.group === group && c.id !== "command.palette",
                  ).map((command) => {
                    const binding = effectiveHotkey(command, overrides);
                    return (
                      <CommandItem
                        key={command.id}
                        value={command.label}
                        onSelect={() => {
                          setOpen(false);
                          runCommand(command.id);
                        }}
                      >
                        <span className="truncate">{command.label}</span>
                        {binding && (
                          <Kbd className="ml-auto h-4 px-1 text-[10px]">
                            {displayHotkey(binding)}
                          </Kbd>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
              <CommandGroup heading="Editor-Aktionen">
                {EDITOR_ACTIONS.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.label}
                    onSelect={() => {
                      setOpen(false);
                      requestAnimationFrame(() => runEditorAction(action.id));
                    }}
                  >
                    <span className="truncate">{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
