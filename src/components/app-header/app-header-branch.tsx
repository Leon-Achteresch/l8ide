import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Cloud,
  GitBranch,
  Plus,
} from "lucide-react";
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
import { useGitStore, type BranchInfo } from "@/lib/git-store";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

const PREFIXES = ["feature/", "fix/", "chore/", "hotfix/"] as const;
const TRUNK = new Set(["main", "master", "develop", "dev", "trunk"]);

function splitBranch(name: string) {
  const i = name.indexOf("/");
  if (i < 0) return { prefix: "", slug: name };
  return { prefix: name.slice(0, i + 1), slug: name.slice(i + 1) };
}

function remoteParts(name: string) {
  const i = name.indexOf("/");
  if (i < 0) return { remote: name, branch: "" };
  return { remote: name.slice(0, i), branch: name.slice(i + 1) };
}

function branchMatches(name: string, q: string) {
  const needle = q.toLowerCase();
  if (name.toLowerCase().includes(needle)) return true;
  const { prefix, slug } = splitBranch(name);
  return (
    slug.toLowerCase().includes(needle) ||
    prefix.toLowerCase().startsWith(needle)
  );
}

function resolveCreateName(q: string) {
  if (q.includes("/")) return q;
  return `feature/${q}`;
}

function sortBranches(a: BranchInfo, b: BranchInfo) {
  if (a.is_current) return -1;
  if (b.is_current) return 1;
  const rank = (n: string) => {
    const base = n.split("/")[0]?.toLowerCase() ?? n.toLowerCase();
    return TRUNK.has(base) || TRUNK.has(n.toLowerCase()) ? 0 : 1;
  };
  const d = rank(a.name) - rank(b.name);
  return d !== 0 ? d : a.name.localeCompare(b.name);
}

function groupRemotes(remotes: BranchInfo[]) {
  const map = new Map<string, BranchInfo[]>();
  for (const b of remotes) {
    const { remote } = remoteParts(b.name);
    const list = map.get(remote) ?? [];
    list.push(b);
    map.set(remote, list);
  }
  for (const list of map.values()) list.sort(sortBranches);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function applyPrefix(query: string, prefix: string) {
  const t = query.trim();
  if (!t) return prefix;
  if (PREFIXES.some((p) => t.startsWith(p))) return prefix;
  if (!t.includes("/")) return `${prefix}${t}`;
  return prefix;
}

function isActiveBranch(b: BranchInfo, current: string) {
  if (b.is_current) return true;
  if (b.is_remote) return remoteParts(b.name).branch === current;
  return b.name === current;
}

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
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [remoteGroupsOpen, setRemoteGroupsOpen] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    void refresh();
  }, [rootPath, refresh]);

  useEffect(() => {
    if (open) void loadBranches();
  }, [open, loadBranches]);

  if (!rootPath || !branch) return null;

  const q = query.trim();
  const searching = q.length > 0;
  const matched = searching
    ? branches.filter((b) => branchMatches(b.name, q))
    : branches;
  const filteredLocals = matched.filter((b) => !b.is_remote).sort(sortBranches);
  const filteredRemotes = matched.filter((b) => b.is_remote);
  const remoteGroups = groupRemotes(filteredRemotes);
  const locals = branches.filter((b) => !b.is_remote);
  const createName = q ? resolveCreateName(q) : "";
  const showCreate =
    q.length > 0 &&
    !locals.some((b) => b.name.toLowerCase() === createName.toLowerCase());
  const { prefix: branchPrefix, slug: branchSlug } = splitBranch(branch);
  const { prefix: createPrefix, slug: createSlug } = splitBranch(createName);
  const localExpanded = searching ? filteredLocals.length > 0 : localOpen;
  const remoteExpanded = searching ? filteredRemotes.length > 0 : remoteOpen;

  const toggleRemoteGroup = (remote: string) => {
    setRemoteGroupsOpen((s) => ({ ...s, [remote]: !(s[remote] ?? remote === "origin") }));
  };

  const isRemoteGroupOpen = (remote: string, count: number) => {
    if (searching) return count > 0;
    return remoteGroupsOpen[remote] ?? remote === "origin";
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  };
  const onSwitch = (b: BranchInfo) => {
    close(false);
    if (b.is_remote) void checkout(remoteParts(b.name).branch, b.name);
    else void checkout(b.name);
  };
  const onCreate = (name: string) => {
    if (!name) return;
    close(false);
    void createBranch(name);
  };

  const empty = filteredLocals.length === 0 && filteredRemotes.length === 0 && !showCreate;

  return (
    <Popover open={open} onOpenChange={close}>
      <PopoverTrigger
        render={
          <button
            type="button"
            title="Branch wechseln oder erstellen"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            className="flex h-6 max-w-[200px] items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground data-popup-open:bg-foreground/10 data-popup-open:text-foreground"
          >
            <GitBranch className="size-3.5 shrink-0" />
            <span className="flex min-w-0 items-baseline truncate">
              {branchPrefix ? (
                <>
                  <span className="shrink-0 text-muted-foreground/70">
                    {branchPrefix}
                  </span>
                  <span className="truncate">{branchSlug}</span>
                </>
              ) : (
                <span className="truncate">{branch}</span>
              )}
            </span>
            {behind > 0 && (
              <span className="flex shrink-0 items-center gap-0.5">
                <ArrowDown className="size-3" />
                {behind}
              </span>
            )}
            {ahead > 0 && (
              <span className="flex shrink-0 items-center gap-0.5">
                <ArrowUp className="size-3" />
                {ahead}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-64 gap-0 overflow-hidden p-0"
      >
        <Command shouldFilter={false} className="gap-0 rounded-none! bg-transparent p-1">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="feature/name…"
            className="font-mono text-xs"
          />
          <div className="flex gap-1 px-1 pb-1">
            {PREFIXES.map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery(applyPrefix(query, p))}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground",
                  q.startsWith(p) && "bg-foreground/10 text-foreground",
                )}
              >
                {p.slice(0, -1)}
              </button>
            ))}
          </div>
          <CommandList className="max-h-56">
            {showCreate && (
              <CommandItem
                value={`__create__${createName}`}
                onSelect={() => onCreate(createName)}
                className="gap-2 font-mono text-xs [&_svg:last-child]:hidden"
              >
                <Plus className="size-3.5 shrink-0" />
                <span className="flex min-w-0 items-baseline truncate">
                  <span className="shrink-0 text-muted-foreground">+ </span>
                  {createPrefix ? (
                    <>
                      <span className="shrink-0 text-muted-foreground">
                        {createPrefix}
                      </span>
                      <span className="truncate font-medium">{createSlug}</span>
                    </>
                  ) : (
                    <span className="truncate font-medium">{createName}</span>
                  )}
                </span>
              </CommandItem>
            )}

            {empty ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                Keine Branches
              </div>
            ) : (
              <>
                {(searching ? filteredLocals.length > 0 : true) && (
                  <div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setLocalOpen((v) => !v)}
                      className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 shrink-0 transition-transform",
                          localExpanded && "rotate-90",
                        )}
                      />
                      <GitBranch className="size-3 shrink-0" />
                      <span>Lokal</span>
                      <span className="ml-auto tabular-nums">{filteredLocals.length}</span>
                    </button>
                    {localExpanded &&
                      (filteredLocals.length === 0 ? (
                        <p className="px-6 py-1 text-[11px] text-muted-foreground">
                          Keine lokalen Branches
                        </p>
                      ) : (
                        filteredLocals.map((b) => {
                          const { prefix, slug } = splitBranch(b.name);
                          return (
                          <CommandItem
                            key={b.name}
                            value={`local:${b.name}`}
                            onSelect={() => onSwitch(b)}
                            className={cn(
                              "gap-2 pl-6 font-mono text-xs [&_svg:last-child]:hidden",
                              isActiveBranch(b, branch) && "font-medium",
                            )}
                          >
                            <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex min-w-0 flex-1 items-baseline truncate">
                              {prefix ? (
                                <>
                                  <span className="shrink-0 text-muted-foreground">
                                    {prefix}
                                  </span>
                                  <span className="truncate">{slug}</span>
                                </>
                              ) : (
                                <span className="truncate">{b.name}</span>
                              )}
                            </span>
                            {isActiveBranch(b, branch) && (
                              <Check className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                          </CommandItem>
                          );
                        })
                      ))}
                  </div>
                )}

                {(searching ? filteredRemotes.length > 0 : true) && (
                  <div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setRemoteOpen((v) => !v)}
                      className="flex w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 shrink-0 transition-transform",
                          remoteExpanded && "rotate-90",
                        )}
                      />
                      <Cloud className="size-3 shrink-0" />
                      <span>Remote</span>
                      <span className="ml-auto tabular-nums">{filteredRemotes.length}</span>
                    </button>
                    {remoteExpanded &&
                      (remoteGroups.length === 0 ? (
                        <p className="px-6 py-1 text-[11px] text-muted-foreground">
                          Keine Remote-Branches
                        </p>
                      ) : (
                        remoteGroups.map(([remote, items]) => {
                          const groupOpen = isRemoteGroupOpen(remote, items.length);
                          return (
                            <div key={remote}>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => toggleRemoteGroup(remote)}
                                className="flex w-full items-center gap-1.5 py-1 pr-2 pl-5 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                <ChevronRight
                                  className={cn(
                                    "size-3 shrink-0 transition-transform",
                                    groupOpen && "rotate-90",
                                  )}
                                />
                                <span className="truncate font-mono">{remote}</span>
                                <span className="ml-auto tabular-nums">{items.length}</span>
                              </button>
                              {groupOpen &&
                                items.map((b) => {
                                  const { branch: remoteBranch } = remoteParts(b.name);
                                  const { prefix, slug } = splitBranch(remoteBranch);
                                  const active = isActiveBranch(b, branch);
                                  return (
                                    <CommandItem
                                      key={b.name}
                                      value={`remote:${b.name}`}
                                      onSelect={() => onSwitch(b)}
                                      className={cn(
                                        "gap-2 pl-9 font-mono text-xs [&_svg:last-child]:hidden",
                                        active && "font-medium",
                                      )}
                                    >
                                      <Cloud className="size-3.5 shrink-0 text-muted-foreground/70" />
                                      <span className="flex min-w-0 flex-1 items-baseline truncate">
                                        {prefix ? (
                                          <>
                                            <span className="shrink-0 text-muted-foreground">
                                              {prefix}
                                            </span>
                                            <span className="truncate">{slug}</span>
                                          </>
                                        ) : (
                                          <span className="truncate">{remoteBranch}</span>
                                        )}
                                      </span>
                                      {active && (
                                        <Check className="size-3.5 shrink-0 text-muted-foreground" />
                                      )}
                                    </CommandItem>
                                  );
                                })}
                            </div>
                          );
                        })
                      ))}
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
