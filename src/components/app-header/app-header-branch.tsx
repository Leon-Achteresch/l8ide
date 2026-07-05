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
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Cloud,
  GitBranch,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties } from "react";
import {
  MENU_CONTAINER,
  MENU_ITEM,
  MENU_SPRING,
  SIDEBAR_TAB_SPRING,
} from "./constants";

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

function branchNameLabel(name: string, emphasis = false) {
  const { prefix, slug } = splitBranch(name);
  if (!prefix) {
    return (
      <span className={cn("truncate", emphasis && "font-medium")}>{name}</span>
    );
  }
  return (
    <span className="flex min-w-0 items-baseline truncate">
      <span className="shrink-0 text-muted-foreground">{prefix}</span>
      <span className={cn("truncate", emphasis && "font-medium")}>{slug}</span>
    </span>
  );
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
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [localOpen, setLocalOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const [remoteGroupsOpen, setRemoteGroupsOpen] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    void refresh();
  }, [rootPath, refresh]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void loadBranches().finally(() => setLoading(false));
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
  const hasSync = ahead > 0 || behind > 0;
  const activePrefix = PREFIXES.find((p) => q.startsWith(p)) ?? null;

  const toggleRemoteGroup = (remote: string) => {
    setRemoteGroupsOpen((s) => ({
      ...s,
      [remote]: !(s[remote] ?? remote === "origin"),
    }));
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

  const empty =
    filteredLocals.length === 0 && filteredRemotes.length === 0 && !showCreate;

  return (
    <Popover open={open} onOpenChange={close}>
      <PopoverTrigger
        render={
          <motion.button
            type="button"
            title="Branch wechseln oder erstellen"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            animate={{ scale: open ? 0.98 : 1 }}
            whileHover={
              reduceMotion ? undefined : { scale: open ? 0.98 : 1.02 }
            }
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            transition={{ type: "spring", stiffness: 600, damping: 28 }}
            className={cn(
              "flex h-7 max-w-[220px] items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150",
              "hover:bg-foreground/8 hover:text-foreground",
              "data-popup-open:bg-foreground/10 data-popup-open:text-foreground",
            )}
          >
            <GitBranch className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="flex min-w-0 flex-1 items-baseline truncate">
              {branchPrefix ? (
                <>
                  <span className="shrink-0 text-muted-foreground/70">
                    {branchPrefix}
                  </span>
                  <span className="truncate font-medium text-foreground/90">
                    {branchSlug}
                  </span>
                </>
              ) : (
                <span className="truncate font-medium text-foreground/90">
                  {branch}
                </span>
              )}
            </span>
            {hasSync ? (
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-foreground/[0.06] px-1 py-px font-mono text-[10px] tabular-nums ring-1 ring-foreground/[0.04]">
                {behind > 0 ? (
                  <span className="flex items-center gap-px text-amber-600 dark:text-amber-500">
                    <ArrowDown className="size-2.5" strokeWidth={2.5} />
                    {behind}
                  </span>
                ) : null}
                {ahead > 0 ? (
                  <span className="flex items-center gap-px text-sky-600 dark:text-sky-400">
                    <ArrowUp className="size-2.5" strokeWidth={2.5} />
                    {ahead}
                  </span>
                ) : null}
              </span>
            ) : null}
          </motion.button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-max-w-[320px] gap-0 overflow-hidden border-t-none p-0 data-closed:animate-none data-open:animate-none"
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={MENU_CONTAINER}
        >
          <motion.div variants={MENU_ITEM} className="p-2 pb-1">
            <Command
              shouldFilter={false}
              className="gap-0 rounded-none! bg-transparent p-0"
            >
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Branch suchen oder erstellen…"
                className="font-mono text-xs"
              />
              <div className="relative mt-2 inline-flex h-7 w-full items-center rounded-lg bg-foreground/[0.05] p-0.5 ring-1 ring-foreground/[0.04]">
                {PREFIXES.map((p) => {
                  const active = activePrefix === p;
                  return (
                    <motion.button
                      key={p}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setQuery(applyPrefix(query, p))}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      transition={{
                        type: "spring",
                        stiffness: 600,
                        damping: 30,
                      }}
                      className={cn(
                        "relative z-10 flex-1 rounded-md py-0.5 font-mono text-[10px] font-medium transition-colors duration-150",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="branch-prefix-indicator"
                          transition={SIDEBAR_TAB_SPRING}
                          className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-foreground/8"
                          aria-hidden
                        />
                      ) : null}
                      {p.slice(0, -1)}
                    </motion.button>
                  );
                })}
              </div>

              <CommandList className="mt-1 max-h-60">
                {loading && branches.length === 0 ? (
                  <div className="flex flex-col gap-1.5 px-1 py-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-7 animate-pulse rounded-md bg-foreground/[0.06]"
                      />
                    ))}
                  </div>
                ) : null}

                {!loading && showCreate ? (
                  <CommandItem
                    value={`__create__${createName}`}
                    onSelect={() => onCreate(createName)}
                    className="gap-2 rounded-md font-mono text-xs [&_svg:last-child]:hidden"
                  >
                    <Plus
                      className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400"
                      strokeWidth={2}
                    />
                    <span className="flex min-w-0 items-baseline truncate">
                      <span className="shrink-0 text-muted-foreground">
                        Neu{" "}
                      </span>
                      {createPrefix ? (
                        <>
                          <span className="shrink-0 text-muted-foreground">
                            {createPrefix}
                          </span>
                          <span className="truncate font-medium">
                            {createSlug}
                          </span>
                        </>
                      ) : (
                        <span className="truncate font-medium">
                          {createName}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ) : null}

                {!loading && empty ? (
                  <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Keine Branches gefunden
                  </div>
                ) : null}

                {!loading && !empty ? (
                  <>
                    {(searching ? filteredLocals.length > 0 : true) ? (
                      <div className="py-0.5">
                        <motion.button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setLocalOpen((v) => !v)}
                          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                          transition={{
                            type: "spring",
                            stiffness: 600,
                            damping: 30,
                          }}
                          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
                        >
                          <motion.span
                            animate={{ rotate: localExpanded ? 90 : 0 }}
                            transition={MENU_SPRING}
                            className="inline-flex shrink-0"
                          >
                            <ChevronRight
                              className="size-3.5"
                              strokeWidth={2}
                            />
                          </motion.span>
                          <GitBranch
                            className="size-3 shrink-0"
                            strokeWidth={2}
                          />
                          <span>Lokal</span>
                          <span className="ml-auto tabular-nums text-muted-foreground/70">
                            {filteredLocals.length}
                          </span>
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {localExpanded ? (
                            <motion.div
                              key="local-branches"
                              initial={
                                reduceMotion ? false : { height: 0, opacity: 0 }
                              }
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={MENU_SPRING}
                              className="overflow-hidden"
                            >
                              {filteredLocals.length === 0 ? (
                                <p className="px-6 py-1.5 text-[11px] text-muted-foreground">
                                  Keine lokalen Branches
                                </p>
                              ) : (
                                filteredLocals.map((b, index) => {
                                  const active = isActiveBranch(b, branch);
                                  return (
                                    <motion.div
                                      key={b.name}
                                      initial={
                                        reduceMotion
                                          ? false
                                          : { opacity: 0, x: -6 }
                                      }
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{
                                        ...MENU_SPRING,
                                        delay: reduceMotion ? 0 : index * 0.02,
                                      }}
                                    >
                                      <CommandItem
                                        value={`local:${b.name}`}
                                        onSelect={() => onSwitch(b)}
                                        className={cn(
                                          "gap-2 rounded-md pl-6 font-mono text-xs [&_svg:last-child]:hidden",
                                          active &&
                                            "bg-foreground/[0.06] font-medium ring-1 ring-foreground/[0.05]",
                                        )}
                                      >
                                        <GitBranch
                                          className={cn(
                                            "size-3.5 shrink-0",
                                            active
                                              ? "text-foreground"
                                              : "text-muted-foreground",
                                          )}
                                          strokeWidth={2}
                                        />
                                        <span className="min-w-0 flex-1">
                                          {branchNameLabel(b.name, active)}
                                        </span>
                                        {active ? (
                                          <Check
                                            className="size-3.5 shrink-0 text-foreground"
                                            strokeWidth={2}
                                          />
                                        ) : null}
                                      </CommandItem>
                                    </motion.div>
                                  );
                                })
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ) : null}

                    {(searching ? filteredRemotes.length > 0 : true) ? (
                      <div className="border-t border-border/40 py-0.5">
                        <motion.button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setRemoteOpen((v) => !v)}
                          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                          transition={{
                            type: "spring",
                            stiffness: 600,
                            damping: 30,
                          }}
                          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
                        >
                          <motion.span
                            animate={{ rotate: remoteExpanded ? 90 : 0 }}
                            transition={MENU_SPRING}
                            className="inline-flex shrink-0"
                          >
                            <ChevronRight
                              className="size-3.5"
                              strokeWidth={2}
                            />
                          </motion.span>
                          <Cloud className="size-3 shrink-0" strokeWidth={2} />
                          <span>Remote</span>
                          <span className="ml-auto tabular-nums text-muted-foreground/70">
                            {filteredRemotes.length}
                          </span>
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {remoteExpanded ? (
                            <motion.div
                              key="remote-branches"
                              initial={
                                reduceMotion ? false : { height: 0, opacity: 0 }
                              }
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={MENU_SPRING}
                              className="overflow-hidden"
                            >
                              {remoteGroups.length === 0 ? (
                                <p className="px-6 py-1.5 text-[11px] text-muted-foreground">
                                  Keine Remote-Branches
                                </p>
                              ) : (
                                remoteGroups.map(([remote, items]) => {
                                  const groupOpen = isRemoteGroupOpen(
                                    remote,
                                    items.length,
                                  );
                                  return (
                                    <div key={remote}>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() =>
                                          toggleRemoteGroup(remote)
                                        }
                                        className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 pl-5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
                                      >
                                        <motion.span
                                          animate={{
                                            rotate: groupOpen ? 90 : 0,
                                          }}
                                          transition={MENU_SPRING}
                                          className="inline-flex shrink-0"
                                        >
                                          <ChevronRight
                                            className="size-3"
                                            strokeWidth={2}
                                          />
                                        </motion.span>
                                        <span className="truncate font-mono">
                                          {remote}
                                        </span>
                                        <span className="ml-auto tabular-nums text-muted-foreground/70">
                                          {items.length}
                                        </span>
                                      </button>
                                      <AnimatePresence initial={false}>
                                        {groupOpen ? (
                                          <motion.div
                                            key={`${remote}-items`}
                                            initial={
                                              reduceMotion
                                                ? false
                                                : { height: 0, opacity: 0 }
                                            }
                                            animate={{
                                              height: "auto",
                                              opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={MENU_SPRING}
                                            className="overflow-hidden"
                                          >
                                            {items.map((b) => {
                                              const { branch: remoteBranch } =
                                                remoteParts(b.name);
                                              const active = isActiveBranch(
                                                b,
                                                branch,
                                              );
                                              return (
                                                <CommandItem
                                                  key={b.name}
                                                  value={`remote:${b.name}`}
                                                  onSelect={() => onSwitch(b)}
                                                  className={cn(
                                                    "gap-2 rounded-md pl-9 font-mono text-xs [&_svg:last-child]:hidden",
                                                    active &&
                                                      "bg-foreground/[0.06] font-medium ring-1 ring-foreground/[0.05]",
                                                  )}
                                                >
                                                  <Cloud
                                                    className={cn(
                                                      "size-3.5 shrink-0",
                                                      active
                                                        ? "text-foreground"
                                                        : "text-muted-foreground/70",
                                                    )}
                                                    strokeWidth={2}
                                                  />
                                                  <span className="min-w-0 flex-1">
                                                    {branchNameLabel(
                                                      remoteBranch,
                                                      active,
                                                    )}
                                                  </span>
                                                  {active ? (
                                                    <Check
                                                      className="size-3.5 shrink-0 text-foreground"
                                                      strokeWidth={2}
                                                    />
                                                  ) : null}
                                                </CommandItem>
                                              );
                                            })}
                                          </motion.div>
                                        ) : null}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </CommandList>
            </Command>
          </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
