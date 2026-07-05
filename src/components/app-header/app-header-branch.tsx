import { ArrowDown, ArrowUp, Check, GitBranch, Plus } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function AppHeaderBranch() {
  const branch = useGitStore((s) => s.branch);
  const ahead = useGitStore((s) => s.ahead);
  const behind = useGitStore((s) => s.behind);
  const branches = useGitStore((s) => s.branches);
  const refresh = useGitStore((s) => s.refresh);
  const loadBranches = useGitStore((s) => s.loadBranches);
  const checkout = useGitStore((s) => s.checkout);
  const createBranch = useGitStore((s) => s.createBranch);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void refresh();
  }, [rootPath, refresh]);

  useEffect(() => {
    if (open) void loadBranches();
  }, [open, loadBranches]);

  if (!rootPath || !branch) return null;

  const q = query.trim();
  const locals = branches.filter((b) => !b.is_remote);
  const filtered = q
    ? locals.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
    : locals;
  const exact = locals.some((b) => b.name.toLowerCase() === q.toLowerCase());
  const showCreate = q.length > 0 && !exact;

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };
  const onSwitch = (name: string) => {
    close(false);
    void checkout(name);
  };
  const onCreate = () => {
    if (!q) return;
    close(false);
    void createBranch(q);
  };

  return (
    <Popover open={open} onOpenChange={close}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="Branch wechseln oder erstellen"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            className="flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground data-popup-open:bg-foreground/10 data-popup-open:text-foreground"
          >
            <GitBranch className="size-3.5" />
            <span className="max-w-[140px] truncate">{branch}</span>
            {behind > 0 && (
              <span className="flex items-center gap-0.5">
                <ArrowDown className="size-3" />
                {behind}
              </span>
            )}
            {ahead > 0 && (
              <span className="flex items-center gap-0.5">
                <ArrowUp className="size-3" />
                {ahead}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Branch suchen oder erstellen…"
          />
          <CommandList>
            {showCreate && (
              <CommandItem value="__create__" onSelect={onCreate} className="gap-2">
                <Plus className="size-3.5 shrink-0" />
                <span className="truncate">
                  Branch erstellen: <span className="font-medium">{q}</span>
                </span>
              </CommandItem>
            )}
            {filtered.length === 0 && !showCreate ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Keine Branches
              </div>
            ) : (
              filtered.map((b) => (
                <CommandItem
                  key={b.name}
                  value={b.name}
                  onSelect={() => onSwitch(b.name)}
                  className="gap-2"
                >
                  <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  {b.is_current && <Check className="size-3.5 shrink-0" />}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
