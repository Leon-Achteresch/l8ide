import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Search,
  ShieldAlert,
  SplitSquareHorizontal,
  Terminal as TerminalIcon,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  attachSession,
  disposeSession,
  getSession,
  runCommand,
  subscribeSessions,
} from "@/lib/terminal";
import {
  type IntegrationState,
} from "@/lib/terminal-shell-integration";
import { useProfiles } from "@/lib/terminal-profiles";
import { useTerminalStore } from "@/lib/terminal-store";
import { useIsWorkspaceTrusted, useWorkspaceStore } from "@/lib/workspace-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TerminalFind } from "@/components/terminal/terminal-find";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { copyText } from "@/lib/path-actions";
import { cn } from "@/lib/utils";

const EMPTY: IntegrationState = { cwd: null, sticky: null, quickFixes: [], history: [] };

function useIntegrationState(paneId: number | null): IntegrationState {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (paneId == null) return () => {};
      let integUnsub = () => {};
      let wired: unknown = null;
      const wire = () => {
        const s = getSession(paneId);
        if (s && s.integration !== wired) {
          integUnsub();
          wired = s.integration;
          integUnsub = s.integration.subscribe(cb);
        }
      };
      wire();
      const sesUnsub = subscribeSessions(() => {
        wire();
        cb();
      });
      return () => {
        integUnsub();
        sesUnsub();
      };
    },
    [paneId],
  );
  const snapshot = () =>
    (paneId != null ? getSession(paneId)?.integration.getState() : null) ?? EMPTY;
  return useSyncExternalStore(subscribe, snapshot);
}

function basename(path: string | null) {
  if (!path) return null;
  return path.replace(/\/$/, "").split("/").pop() || path;
}

function PaneView({
  paneId,
  visible,
  active,
}: {
  paneId: number;
  visible: boolean;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const setActivePane = useTerminalStore((s) => s.setActivePane);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  useEffect(() => {
    if (!ref.current) return;
    const pane = useTerminalStore.getState().panes[paneId];
    void attachSession(paneId, ref.current, {
      profileId: pane?.profileId ?? "default",
      cwd: pane?.cwd ?? rootPath,
      ptyId: pane?.ptyId ?? null,
    });
  }, [paneId]);

  useEffect(() => {
    if (!ref.current || !visible) return;
    const session = getSession(paneId);
    if (!session) return;
    session.fit.fit();
    if (active) session.term.focus();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => session.fit.fit());
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [paneId, visible, active]);

  const term = () => getSession(paneId)?.term;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        data-context-surface
        ref={ref}
        onPointerDown={() => {
          setActivePane(paneId);
          getSession(paneId)?.term.focus();
        }}
        className={cn(
          "size-full overflow-hidden",
          active && "ring-1 ring-inset ring-primary/40",
        )}
      />
      <ContextMenuContent className="min-w-52">
        <ContextMenuItem
          disabled={!term()?.hasSelection()}
          onClick={() => {
            const sel = term()?.getSelection();
            if (sel) copyText(sel, "Auswahl kopiert");
          }}
        >
          Kopieren
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() =>
            void navigator.clipboard
              .readText()
              .then((text) => text && runCommand(paneId, text))
          }
        >
          Einfügen
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => term()?.selectAll()}>
          Alles auswählen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            term()?.clear();
            term()?.focus();
          }}
        >
          Leeren
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => useTerminalStore.getState().splitActive()}
        >
          Terminal teilen
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => useTerminalStore.getState().addGroup()}
        >
          Neues Terminal
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => {
            useTerminalStore.getState().closePane(paneId);
            disposeSession(paneId);
          }}
        >
          Terminal beenden
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ProfileMenu() {
  const profiles = useProfiles();
  const addGroup = useTerminalStore((s) => s.addGroup);
  const defaultProfileId = useTerminalStore((s) => s.defaultProfileId);
  const setDefaultProfile = useTerminalStore((s) => s.setDefaultProfile);
  const addCustomProfile = useTerminalStore((s) => s.addCustomProfile);
  const [customOpen, setCustomOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [command, setCommand] = useState("");

  function saveCustom() {
    const parts = command.trim().split(/\s+/);
    if (!parts[0]) return;
    addCustomProfile({
      label: label.trim() || parts[0],
      path: parts[0],
      args: parts.slice(1),
    });
    const list = useTerminalStore.getState().customProfiles;
    const created = list[list.length - 1];
    if (created) addGroup(created.id);
    setLabel("");
    setCommand("");
    setCustomOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Terminal-Profil wählen"
        >
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Neues Terminal</DropdownMenuLabel>
            {profiles.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => addGroup(p.id)}>
                <TerminalIcon className="size-3.5" />
                <span className="truncate">{p.label}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => setCustomOpen(true)}>
              <Plus className="size-3.5" />
              Benutzerdefiniert…
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={defaultProfileId ?? profiles[0]?.id ?? ""}
            onValueChange={setDefaultProfile}
          >
            <DropdownMenuLabel>Standard-Profil</DropdownMenuLabel>
            {profiles.map((p) => (
              <DropdownMenuRadioItem key={p.id} value={p.id}>
                {p.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger className="sr-only" aria-hidden />
        <PopoverContent align="end" className="w-64 space-y-2">
          <p className="text-xs font-medium">Benutzerdefiniertes Profil</p>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name (optional)"
            className="h-7 text-xs"
          />
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveCustom()}
            placeholder="Befehl, z. B. python3 -q"
            className="h-7 text-xs"
          />
          <Button size="sm" className="h-7 w-full text-xs" onClick={saveCustom}>
            Erstellen
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
}

export function TerminalPanel() {
  const open = useTerminalStore((s) => s.open);
  const height = useTerminalStore((s) => s.height);
  const groups = useTerminalStore((s) => s.groups);
  const panes = useTerminalStore((s) => s.panes);
  const activeGroup = useTerminalStore((s) => s.activeGroup);
  const activePane = useTerminalStore((s) => s.activePane);
  const setHeight = useTerminalStore((s) => s.setHeight);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const setActiveGroup = useTerminalStore((s) => s.setActiveGroup);
  const addGroup = useTerminalStore((s) => s.addGroup);
  const splitActive = useTerminalStore((s) => s.splitActive);
  const closeGroup = useTerminalStore((s) => s.closeGroup);
  const closePane = useTerminalStore((s) => s.closePane);
  const trusted = useIsWorkspaceTrusted();
  const [findOpen, setFindOpen] = useState(false);

  const integration = useIntegrationState(activePane);

  function closeGroupAndSessions(id: number) {
    const group = groups.find((g) => g.id === id);
    group?.panes.forEach(disposeSession);
    closeGroup(id);
  }

  function closePaneAndSession(id: number) {
    disposeSession(id);
    closePane(id);
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;
    let y = startY;
    let frame = 0;
    function onMove(ev: PointerEvent) {
      y = ev.clientY;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setHeight(startHeight + startY - y);
        });
      }
    }
    function onUp() {
      if (frame) cancelAnimationFrame(frame);
      setHeight(startHeight + startY - y);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    }
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setFindOpen(true);
    } else if (e.key === "Escape" && findOpen) {
      setFindOpen(false);
    }
  }

  if (!open) return null;

  const iconBtn =
    "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      onKeyDownCapture={onKeyDown}
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t border-border/60 bg-background"
    >
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 -top-1 z-20 h-2 cursor-row-resize"
      />
      <div className="flex h-9 shrink-0 items-center gap-1 px-2">
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Terminal
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {groups.map((group) => {
            const rep = group.panes.find((p) => p === activePane) ?? group.panes[0];
            const pane = panes[rep];
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={cn(
                  "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent",
                  activeGroup === group.id && "bg-accent text-foreground",
                )}
              >
                <TerminalIcon className="size-3.5" />
                <span className="max-w-40 truncate">{pane?.title ?? "shell"}</span>
                {group.panes.length > 1 && (
                  <span className="rounded bg-muted px-1 text-[10px]">
                    {group.panes.length}
                  </span>
                )}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeGroupAndSessions(group.id);
                  }}
                  className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </span>
              </button>
            );
          })}
        </div>

        <button
          className={iconBtn}
          disabled={!activeGroup}
          onClick={() => getSession(activePane ?? -1)?.integration.scrollToCommand(-1)}
          title="Vorheriges Kommando"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          className={iconBtn}
          disabled={!activeGroup}
          onClick={() => getSession(activePane ?? -1)?.integration.scrollToCommand(1)}
          title="Nächstes Kommando"
        >
          <ChevronDown className="size-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={iconBtn}
            disabled={!integration.history.length}
            title="Command-History"
          >
            <History className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 w-64 overflow-y-auto">
            {[...integration.history].reverse().map((cmd, i) => (
              <DropdownMenuItem
                key={`${cmd}-${i}`}
                onClick={() => activePane != null && runCommand(activePane, cmd)}
              >
                <span className="truncate font-mono text-xs">{cmd}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          className={iconBtn}
          onClick={() => setFindOpen((v) => !v)}
          disabled={!activeGroup}
          title="Im Terminal suchen (Ctrl+F)"
        >
          <Search className="size-4" />
        </button>
        <button
          onClick={() => splitActive()}
          disabled={!trusted || !activeGroup}
          className={iconBtn}
          title="Terminal teilen"
        >
          <SplitSquareHorizontal className="size-4" />
        </button>
        <div className="flex items-center">
          <button
            onClick={() => addGroup()}
            disabled={!trusted}
            className={iconBtn}
            title="Neues Terminal"
          >
            <Plus className="size-4" />
          </button>
          {trusted && <ProfileMenu />}
        </div>
        <button onClick={() => setOpen(false)} className={iconBtn} title="Panel schließen">
          <X className="size-4" />
        </button>
      </div>

      {integration.sticky && (
        <div
          className={cn(
            "flex h-6 shrink-0 items-center gap-1.5 border-b bg-muted/40 px-3 font-mono text-[11px]",
            integration.sticky.failed ? "text-red-500" : "text-muted-foreground",
          )}
          title="Sticky Scroll: aktuelles Kommando"
        >
          <span className="opacity-60">❯</span>
          <span className="truncate">{integration.sticky.command}</span>
        </div>
      )}

      {integration.quickFixes.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-amber-500/10 px-3 py-1">
          <Wrench className="size-3.5 text-amber-500" />
          {integration.quickFixes.map((fix) => (
            <button
              key={fix.id}
              onClick={() => activePane != null && runCommand(activePane, fix.run)}
              className="rounded border border-amber-500/40 bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
            >
              {fix.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {trusted ? (
          groups.map((group) => (
            <div
              key={group.id}
              className={cn(
                "absolute inset-0",
                activeGroup !== group.id && "invisible",
              )}
            >
              <ResizablePanelGroup orientation="horizontal">
                {group.panes.map((paneId, i) => (
                  <PaneFragment
                    key={paneId}
                    paneId={paneId}
                    index={i}
                    total={group.panes.length}
                    visible={activeGroup === group.id}
                    active={activePane === paneId}
                    onClose={() => closePaneAndSession(paneId)}
                    cwd={basename(panes[paneId]?.cwd ?? null)}
                  />
                ))}
              </ResizablePanelGroup>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <ShieldAlert className="size-6 text-amber-500" />
            <p className="text-sm font-medium">Terminal im eingeschränkten Modus deaktiviert</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Vertraue diesem Ordner, um Befehle auszuführen. Nutze das Banner oben oder die
              Einstellungen.
            </p>
          </div>
        )}
        {findOpen && activePane != null && (
          <TerminalFind paneId={activePane} onClose={() => setFindOpen(false)} />
        )}
      </div>
    </div>
  );
}

function PaneFragment({
  paneId,
  index,
  total,
  visible,
  active,
  onClose,
  cwd,
}: {
  paneId: number;
  index: number;
  total: number;
  visible: boolean;
  active: boolean;
  onClose: () => void;
  cwd: string | null;
}) {
  return (
    <>
      {index > 0 && <ResizableHandle />}
      <ResizablePanel id={String(paneId)} minSize={10}>
        <div className="relative size-full">
          <PaneView paneId={paneId} visible={visible} active={active} />
          {total > 1 && (
            <div className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-1">
              {cwd && (
                <span className="rounded bg-background/70 px-1 text-[10px] text-muted-foreground">
                  {cwd}
                </span>
              )}
              <button
                onClick={onClose}
                className="pointer-events-auto rounded bg-background/70 p-0.5 text-muted-foreground hover:text-foreground"
                title="Split schließen"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      </ResizablePanel>
    </>
  );
}
