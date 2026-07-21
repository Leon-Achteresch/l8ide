import { Bug } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { runLaunchConfig, useLaunchPalette } from "@/lib/launch-config";
import { cn } from "@/lib/utils";

export function LaunchPalette() {
  const open = useLaunchPalette((s) => s.open);
  const configs = useLaunchPalette((s) => s.configs);
  const setOpen = useLaunchPalette((s) => s.setOpen);

  if (!open) return null;

  const run = (name: string) => {
    setOpen(false);
    const config = configs.find((c) => c.name === name);
    if (config) void runLaunchConfig(config);
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
            <CommandInput placeholder="Debug-Konfiguration starten…" autoFocus />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">
                  Keine Konfiguration in launch.json
                </span>
              </CommandEmpty>
              <CommandGroup heading="launch.json">
                {configs.map((c) => (
                  <CommandItem
                    key={c.name}
                    value={`${c.name} ${c.program}`}
                    onSelect={() => run(c.name)}
                  >
                    <Bug className="size-3.5 shrink-0 text-amber-500" />
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
                      {c.program}
                    </span>
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
