import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGitStore } from "@/lib/git-store";
import { useMarkersStore, useProblemsPanel } from "@/lib/markers-store";
import { getMonacoInstance } from "@/lib/monaco-instance";
import {
  initNotificationCapture,
  useNotifications,
  type NotificationKind,
} from "@/lib/notifications";
import {
  initPortsPolling,
  openPortInBrowser,
  usePortsStore,
} from "@/lib/ports-store";
import { useEditorStatus } from "@/lib/status-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import {
  Activity,
  Ban,
  Bell,
  BellOff,
  CircleCheck,
  CircleX,
  GitBranch,
  Info,
  Radio,
  Sparkles,
  Timer,
  TimerOff,
  TriangleAlert,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useChatStore } from "@/lib/chat-store";
import { SPRING_PANEL } from "@/lib/ease";
import { useEffect, useState } from "react";
import {
  checkNodeEnv,
  scanTodos,
  type NodeEnv,
  type TodoCounts,
} from "@/lib/project-health";
import { formatRemaining, useFocusTimer } from "@/lib/focus-timer";
import { useSearchStore } from "@/lib/search-store";

const KIND_META: Record<
  NotificationKind,
  { icon: typeof Info; className: string }
> = {
  success: { icon: CircleCheck, className: "text-emerald-500" },
  error: { icon: CircleX, className: "text-red-500" },
  warning: { icon: TriangleAlert, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-500" },
};

function AiActivity() {
  const busy = useChatStore((s) => s.busy);
  const setOpen = useChatStore((s) => s.setOpen);
  return (
    <AnimatePresence initial={false}>
      {busy && (
        <motion.button
          type="button"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={SPRING_PANEL}
          onClick={() => setOpen(true)}
          title="KI-Chat öffnen"
          className="inline-flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-md px-1.5 transition-colors hover:bg-foreground/8"
        >
          <Sparkles className="size-3 shrink-0 text-violet-500" strokeWidth={2} />
          <span className="ai-gradient-text font-medium">Agent arbeitet…</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function FocusTimer() {
  const phase = useFocusTimer((s) => s.phase);
  const remaining = useFocusTimer((s) => s.remaining);
  const active = phase !== "idle";
  return (
    <Item
      onClick={() =>
        active
          ? useFocusTimer.getState().stop()
          : useFocusTimer.getState().start("focus")
      }
      title={
        active ? "Fokus-Session beenden" : "Fokus starten (25 Min, DND an)"
      }
      className={cn(active && phase === "focus" && "text-violet-500")}
    >
      {active ? (
        <Timer className="size-3" strokeWidth={2} />
      ) : (
        <TimerOff className="size-3" strokeWidth={2} />
      )}
      {active && (
        <span className="tabular-nums">{formatRemaining(remaining)}</span>
      )}
    </Item>
  );
}

function DevPorts() {
  const ports = usePortsStore((s) => s.ports);

  useEffect(() => {
    initPortsPolling();
  }, []);

  if (ports.length === 0) return null;
  return (
    <>
      {ports.slice(0, 4).map((p) => (
        <Item
          key={p.port}
          onClick={() => openPortInBrowser(p.port)}
          title={`${p.process} auf Port ${p.port} — im Browser öffnen`}
        >
          <Radio className="size-3 text-emerald-500" strokeWidth={2} />
          {p.port}
        </Item>
      ))}
    </>
  );
}

function HealthRow({
  label,
  value,
  onClick,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  accent?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex h-7 w-full items-center rounded-md px-2 text-[11px] text-foreground",
        onClick && "transition-colors hover:bg-foreground/[0.05]",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("ml-auto font-medium tabular-nums", accent)}>
        {value}
      </span>
    </Tag>
  );
}

function ProjectHealth() {
  const total = useMarkersStore((s) => s.total);
  const gitEntries = useGitStore((s) => s.entries.length);
  const ahead = useGitStore((s) => s.ahead);
  const behind = useGitStore((s) => s.behind);
  const ports = usePortsStore((s) => s.ports);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [todos, setTodos] = useState<TodoCounts | null>(null);
  const [nodeEnv, setNodeEnv] = useState<NodeEnv | null>(null);

  const load = () => {
    if (!rootPath) return;
    setTodos(null);
    setNodeEnv(null);
    void scanTodos(rootPath)
      .then(setTodos)
      .catch(() => setTodos({ todo: 0, fixme: 0, hack: 0 }));
    void checkNodeEnv(rootPath)
      .then(setNodeEnv)
      .catch(() => setNodeEnv(null));
  };

  const openTodoSearch = (query: string) => {
    if (!rootPath) return;
    const ws = useWorkspaceStore.getState();
    ws.setSidebarMode("Search");
    if (!ws.sidebarOpen) ws.toggleSidebar();
    const search = useSearchStore.getState();
    search.setQuery(query);
    void search.search(rootPath);
  };

  if (!rootPath) return null;

  return (
    <Popover onOpenChange={(open) => open && load()}>
      <PopoverTrigger
        title="Projekt-Gesundheit"
        className="inline-flex h-full items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        <Activity className="size-3" strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-64 rounded-xl p-1.5 shadow-lg"
      >
        <p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold text-foreground">
          Projekt-Gesundheit
        </p>
        <HealthRow
          label="Fehler / Warnungen"
          value={`${total.errors} / ${total.warnings}`}
          accent={total.errors > 0 ? "text-red-500" : "text-emerald-500"}
          onClick={() => useProblemsPanel.getState().setOpen(true)}
        />
        <HealthRow
          label="TODO · FIXME · HACK"
          value={
            todos === null
              ? "…"
              : `${todos.todo} · ${todos.fixme} · ${todos.hack}`
          }
          accent={
            todos && todos.fixme > 0 ? "text-amber-500" : undefined
          }
          onClick={() => openTodoSearch("\\b(TODO|FIXME|HACK)\\b")}
        />
        <HealthRow
          label="Geänderte Dateien"
          value={gitEntries}
          onClick={() => {
            const ws = useWorkspaceStore.getState();
            ws.setSidebarMode("Scm");
            if (!ws.sidebarOpen) ws.toggleSidebar();
          }}
        />
        {(ahead > 0 || behind > 0) && (
          <HealthRow label="Ahead / Behind" value={`↑${ahead} ↓${behind}`} />
        )}
        {nodeEnv?.required && (
          <HealthRow
            label="Node (erf. / aktiv)"
            value={`${nodeEnv.required} / ${nodeEnv.running ?? "?"}`}
            accent={nodeEnv.ok ? "text-emerald-500/70" : "text-amber-500"}
          />
        )}
        <HealthRow
          label="Dev-Server"
          value={
            ports.length === 0
              ? "—"
              : ports.map((p) => p.port).join(", ")
          }
          accent={ports.length > 0 ? "text-emerald-500" : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}

function NotificationsBell() {
  const items = useNotifications((s) => s.items);
  const unread = useNotifications((s) => s.unread);
  const dnd = useNotifications((s) => s.dnd);
  const setDnd = useNotifications((s) => s.setDnd);
  const markRead = useNotifications((s) => s.markRead);
  const clear = useNotifications((s) => s.clear);

  useEffect(() => {
    initNotificationCapture();
  }, []);

  return (
    <Popover onOpenChange={(open) => open && markRead()}>
      <PopoverTrigger
        title="Benachrichtigungen"
        className="relative inline-flex h-full items-center rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      >
        {dnd ? (
          <BellOff className="size-3" strokeWidth={2} />
        ) : (
          <Bell className="size-3" strokeWidth={2} />
        )}
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-sky-500" />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-80 rounded-xl p-0 shadow-lg"
      >
        <div className="flex h-8 items-center gap-1 px-2.5">
          <span className="text-[11px] font-semibold text-foreground">
            Benachrichtigungen
          </span>
          <div className="ml-auto flex gap-0.5">
            <button
              type="button"
              title={dnd ? "Nicht stören aus" : "Nicht stören (Fehler kommen durch)"}
              aria-pressed={dnd}
              onClick={() => setDnd(!dnd)}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-foreground/8",
                dnd ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <BellOff className="size-3" />
            </button>
            <button
              type="button"
              title="Alle löschen"
              onClick={clear}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              <Ban className="size-3" />
            </button>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto px-1 pb-1">
          {items.length === 0 ? (
            <p className="px-2 py-3 text-[11px] text-muted-foreground">
              Keine Benachrichtigungen.
            </p>
          ) : (
            items.map((n) => {
              const meta = KIND_META[n.kind];
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-[11px] hover:bg-foreground/[0.04]"
                >
                  <meta.icon
                    className={cn("mt-0.5 size-3 shrink-0", meta.className)}
                  />
                  <span className="min-w-0 flex-1 break-words text-foreground">
                    {n.text}
                  </span>
                  <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                    {new Date(n.time).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Item({
  onClick,
  title,
  children,
  className,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-full items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors",
        onClick && "hover:bg-foreground/8 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusBar() {
  const branch = useGitStore((s) => s.branch);
  const total = useMarkersStore((s) => s.total);
  const toggleProblems = useProblemsPanel((s) => s.toggle);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const status = useEditorStatus();
  const showEditor = Boolean(status.editor && activeFile);

  const openScm = () => {
    const ws = useWorkspaceStore.getState();
    ws.setSidebarMode("Scm");
    if (!ws.sidebarOpen) ws.toggleSidebar();
  };

  const gotoLine = () => {
    status.editor?.focus();
    status.editor?.trigger("statusbar", "editor.action.gotoLine", null);
  };

  const toggleIndent = () => {
    status.editor
      ?.getModel()
      ?.updateOptions({ insertSpaces: !status.insertSpaces });
  };

  const toggleEol = () => {
    const m = getMonacoInstance();
    const model = status.editor?.getModel();
    if (!m || !model) return;
    model.setEOL(
      status.eol === "LF"
        ? m.editor.EndOfLineSequence.CRLF
        : m.editor.EndOfLineSequence.LF,
    );
  };

  return (
    <div className="flex h-6 w-full shrink-0 select-none items-stretch justify-between gap-1 px-2 py-0.5 text-[11px]">
      <div className="flex min-w-0 items-stretch gap-1">
        {branch && (
          <Item onClick={openScm} title="Source Control öffnen">
            <GitBranch className="size-3" strokeWidth={2} />
            <span className="truncate">{branch}</span>
          </Item>
        )}
        <Item onClick={toggleProblems} title="Probleme anzeigen">
          <CircleX
            className={cn("size-3", total.errors > 0 && "text-red-500")}
            strokeWidth={2}
          />
          {total.errors}
          <TriangleAlert
            className={cn("size-3", total.warnings > 0 && "text-amber-500")}
            strokeWidth={2}
          />
          {total.warnings}
        </Item>
        <DevPorts />
        <ProjectHealth />
        <FocusTimer />
        <AiActivity />
      </div>
      {showEditor && (
        <div className="flex items-stretch gap-1">
          <Item onClick={gotoLine} title="Gehe zu Zeile/Spalte">
            Z {status.line}, S {status.column}
            {status.selectedChars > 0 && ` (${status.selectedChars} markiert)`}
            {status.selections > 1 && ` · ${status.selections} Cursor`}
          </Item>
          <Item onClick={toggleIndent} title="Einrückung umschalten">
            {status.insertSpaces
              ? `Leerzeichen: ${status.tabSize}`
              : `Tabs: ${status.tabSize}`}
          </Item>
          <Item onClick={toggleEol} title="Zeilenende umschalten">
            {status.eol}
          </Item>
          {status.language && <Item>{status.language}</Item>}
          <NotificationsBell />
        </div>
      )}
      {!showEditor && (
        <div className="flex items-stretch">
          <NotificationsBell />
        </div>
      )}
    </div>
  );
}
