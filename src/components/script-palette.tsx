import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  detectPackageManager,
  readScripts,
  scriptCommand,
  type PackageManager,
  type Script,
} from "@/lib/run-scripts";
import { cn } from "@/lib/utils";
import { useIsWorkspaceTrusted, useWorkspaceStore } from "@/lib/workspace-store";

export const useScriptPalette = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

export function ScriptPalette() {
  const open = useScriptPalette((s) => s.open);
  const setOpen = useScriptPalette((s) => s.setOpen);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const trusted = useIsWorkspaceTrusted();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [pm, setPm] = useState<PackageManager>("npm");

  useEffect(() => {
    if (!open || !rootPath) return;
    void readScripts(rootPath).then(setScripts);
    void detectPackageManager(rootPath).then(setPm);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rootPath, setOpen]);

  if (!open) return null;

  const run = (name: string) => {
    setOpen(false);
    void import("@/lib/terminal").then((m) =>
      m.runInTerminal(scriptCommand(pm, name)),
    );
  };

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
          className="w-full max-w-xl overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command loop>
            <CommandInput placeholder="Script ausführen…" autoFocus />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">
                  {trusted
                    ? "Keine Scripts in package.json"
                    : "Ordner vertrauen, um Scripts auszuführen"}
                </span>
              </CommandEmpty>
              {trusted && scripts.length > 0 && (
                <CommandGroup heading={`Scripts · ${pm}`}>
                  {scripts.map((s) => (
                    <CommandItem
                      key={s.name}
                      value={`${s.name} ${s.command}`}
                      onSelect={() => run(s.name)}
                    >
                      <Play className="size-3.5 shrink-0 text-emerald-500" />
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
                        {s.command}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
