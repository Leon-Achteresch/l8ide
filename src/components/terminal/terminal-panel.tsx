import { useEffect, useRef } from "react";
import { Plus, ShieldAlert, Terminal as TerminalIcon, Trash2, X } from "lucide-react";
import { attachSession, disposeSession, getSession } from "@/lib/terminal";
import { useTerminalStore } from "@/lib/terminal-store";
import { useIsWorkspaceTrusted, useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

function TerminalView({ id, visible }: { id: number; visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  useEffect(() => {
    if (!ref.current) return;
    attachSession(id, ref.current, rootPath);
  }, [id]);

  useEffect(() => {
    if (!ref.current || !visible) return;
    const session = getSession(id);
    if (!session) return;
    session.fit.fit();
    session.term.focus();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => session.fit.fit());
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [id, visible]);

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0 overflow-hidden", !visible && "invisible")}
    />
  );
}

export function TerminalPanel() {
  const open = useTerminalStore((s) => s.open);
  const height = useTerminalStore((s) => s.height);
  const tabs = useTerminalStore((s) => s.tabs);
  const titles = useTerminalStore((s) => s.titles);
  const active = useTerminalStore((s) => s.active);
  const setHeight = useTerminalStore((s) => s.setHeight);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const setActive = useTerminalStore((s) => s.setActive);
  const add = useTerminalStore((s) => s.add);
  const remove = useTerminalStore((s) => s.remove);
  const trusted = useIsWorkspaceTrusted();

  function closeTerminal(id: number) {
    disposeSession(id);
    remove(id);
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

  if (!open) return null;

  return (
    <div
      style={{ height }}
      className="relative flex shrink-0 flex-col border-t bg-background"
    >
      <div
        onPointerDown={startResize}
        className="absolute inset-x-0 -top-1 z-20 h-2 cursor-row-resize"
      />
      <div className="flex h-9 shrink-0 items-center gap-1 border-b px-2">
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Terminal
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((id) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent",
                active === id && "bg-accent text-foreground",
              )}
            >
              <TerminalIcon className="size-3.5" />
              <span className="max-w-40 truncate">{titles[id] ?? "shell"}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(id);
                }}
                className="rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={add}
          disabled={!trusted}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          title="Neues Terminal"
        >
          <Plus className="size-4" />
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Panel schließen"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {trusted ? (
          tabs.map((id) => (
            <TerminalView key={id} id={id} visible={active === id} />
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <ShieldAlert className="size-6 text-amber-500" />
            <p className="text-sm font-medium">Terminal im eingeschränkten Modus deaktiviert</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Vertraue diesem Ordner, um Befehle auszuführen. Nutze das Banner oben oder die Einstellungen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
