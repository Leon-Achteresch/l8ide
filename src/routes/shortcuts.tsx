import { Button } from "@/components/ui/button";
import {
  type Command,
  COMMANDS,
  effectiveHotkey,
  hotkeyFromKeyboardEvent,
  NUMPAD_ADD_HOTKEY,
  sanitizeRecordedHotkey,
  sanitizeZoomInHotkey,
  useHotkeySettings,
} from "@/lib/hotkeys";
import { useHotkeyRecording } from "@/lib/hotkey-recording";
import { cn } from "@/lib/utils";
import {
  formatForDisplay,
  normalizeHotkey,
  useHotkeyRecorder,
} from "@tanstack/react-hotkeys";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/shortcuts")({
  component: ShortcutsPage,
});

const GROUPS = [...new Set(COMMANDS.map((c) => c.group))];

export function ShortcutsPage() {
  const overrides = useHotkeySettings((s) => s.overrides);
  const resetAll = useHotkeySettings((s) => s.resetAll);
  const setOverride = useHotkeySettings((s) => s.setOverride);
  const setRecording = useHotkeyRecording((s) => s.setRecording);
  const [editing, setEditing] = useState<string | null>(null);
  const editingRef = useRef<string | null>(null);

  useEffect(() => {
    return () => useHotkeyRecording.getState().setRecording(false);
  }, []);

  function finishEdit() {
    editingRef.current = null;
    setEditing(null);
    setRecording(false);
  }

  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => {
      if (editingRef.current) {
        const sanitized =
          editingRef.current === "editor.zoomIn"
            ? sanitizeZoomInHotkey(hotkey)
            : sanitizeRecordedHotkey(hotkey);
        setOverride(editingRef.current, sanitized);
      }
      finishEdit();
    },
    onCancel: finishEdit,
    onClear: () => {
      if (editingRef.current) setOverride(editingRef.current, null);
      finishEdit();
    },
    ignoreInputs: false,
  });

  useEffect(() => {
    if (!editing) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") return;
      if (event.code !== "NumpadAdd") return;

      const captured = hotkeyFromKeyboardEvent(event);
      if (!captured || !editingRef.current) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      recorder.stopRecording();

      const sanitized =
        editingRef.current === "editor.zoomIn"
          ? sanitizeZoomInHotkey(captured)
          : sanitizeRecordedHotkey(captured);
      setOverride(editingRef.current, sanitized);
      finishEdit();
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [editing, recorder, setOverride]);

  function beginEdit(id: string) {
    editingRef.current = id;
    setEditing(id);
    setRecording(true);
    recorder.startRecording();
  }

  const bindingCounts = new Map<string, number>();
  for (const c of COMMANDS) {
    const binding = effectiveHotkey(c, overrides);
    if (!binding) continue;
    const key = normalizeHotkey(binding);
    bindingCounts.set(key, (bindingCounts.get(key) ?? 0) + 1);
  }

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex max-w-2xl items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Tastaturkürzel</h1>
          <p className="text-xs text-muted-foreground">
            Klicke auf ein Kürzel und drücke die neue Tastenkombination.
            Escape bricht ab, Backspace deaktiviert das Kürzel.
          </p>
        </div>
        {hasOverrides && (
          <Button variant="secondary" size="sm" onClick={resetAll}>
            Alle zurücksetzen
          </Button>
        )}
      </div>
      {GROUPS.map((group) => (
        <div key={group} className="mt-6 max-w-2xl">
          <p className="text-sm font-medium">{group}</p>
          <ul className="mt-2 space-y-1">
            {COMMANDS.filter((c) => c.group === group).map((command) => (
              <ShortcutRow
                key={command.id}
                command={command}
                binding={effectiveHotkey(command, overrides)}
                overridden={command.id in overrides}
                isEditing={editing === command.id}
                isConflict={(() => {
                  const b = effectiveHotkey(command, overrides);
                  return b ? (bindingCounts.get(normalizeHotkey(b)) ?? 0) > 1 : false;
                })()}
                recordedHotkey={
                  editing === command.id ? recorder.recordedHotkey : null
                }
                onEdit={() => beginEdit(command.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ShortcutRow({
  command,
  binding,
  overridden,
  isEditing,
  isConflict,
  recordedHotkey,
  onEdit,
}: {
  command: Command;
  binding: string | null;
  overridden: boolean;
  isEditing: boolean;
  isConflict: boolean;
  recordedHotkey: string | null;
  onEdit: () => void;
}) {
  const resetOverride = useHotkeySettings((s) => s.resetOverride);

  return (
    <li className="flex items-center justify-between gap-2 rounded border px-3 py-1.5">
      <span className="truncate text-sm">{command.label}</span>
      <div className="flex shrink-0 items-center gap-1.5">
        {isConflict && !isEditing && (
          <span className="text-xs text-destructive">Konflikt</span>
        )}
        {overridden && !isEditing && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            title="Zurücksetzen"
            onClick={() => resetOverride(command.id)}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "rounded border bg-muted px-2 py-0.5 font-mono text-xs",
            isEditing && "border-ring ring-1 ring-ring",
            !isEditing && binding === null && "text-muted-foreground",
          )}
        >
          {isEditing
            ? recordedHotkey
              ? formatBinding(recordedHotkey)
              : "Aufnahme…"
            : binding
              ? formatBinding(binding)
              : "Deaktiviert"}
        </button>
      </div>
    </li>
  );
}

function formatBinding(binding: string) {
  if (binding === NUMPAD_ADD_HOTKEY) {
    return `${formatForDisplay("Mod+=")} (Num)`;
  }
  return formatForDisplay(binding);
}
