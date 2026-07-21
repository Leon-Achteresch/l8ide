import { Terminal } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { runTask, useTaskPalette } from "@/lib/tasks-json";
import { cn } from "@/lib/utils";

export function TaskPalette() {
  const open = useTaskPalette((s) => s.open);
  const tasks = useTaskPalette((s) => s.tasks);
  const setOpen = useTaskPalette((s) => s.setOpen);

  if (!open) return null;

  const run = (label: string) => {
    setOpen(false);
    const task = tasks.find((t) => t.label === label);
    if (task) void runTask(task);
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
            <CommandInput placeholder="Task ausführen…" autoFocus />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">
                  Keine Task in tasks.json
                </span>
              </CommandEmpty>
              <CommandGroup heading="tasks.json">
                {tasks.map((t) => (
                  <CommandItem
                    key={t.label}
                    value={`${t.label} ${t.command}`}
                    onSelect={() => run(t.label)}
                  >
                    <Terminal className="size-3.5 shrink-0 text-sky-500" />
                    <span className="font-medium">{t.label}</span>
                    <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
                      {t.command}
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
