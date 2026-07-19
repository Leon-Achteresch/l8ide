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
  Ban,
  Bell,
  BellOff,
  CircleCheck,
  CircleX,
  GitBranch,
  Info,
  Radio,
  TriangleAlert,
} from "lucide-react";
import { useEffect } from "react";

const KIND_META: Record<
  NotificationKind,
  { icon: typeof Info; className: string }
> = {
  success: { icon: CircleCheck, className: "text-emerald-500" },
  error: { icon: CircleX, className: "text-red-500" },
  warning: { icon: TriangleAlert, className: "text-amber-500" },
  info: { icon: Info, className: "text-sky-500" },
};

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
