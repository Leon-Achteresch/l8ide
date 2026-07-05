import { getMonacoInstance } from "@/lib/monaco-instance";
import { openFileAt } from "@/lib/monaco-navigation";
import {
  useMarkersStore,
  useProblemsPanel,
} from "@/lib/markers-store";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  CircleX,
  Info,
  ListFilter,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import type * as monaco from "monaco-editor";
import { useMemo, useState } from "react";

const SEVERITIES = [8, 4, 2] as const;
type Severity = (typeof SEVERITIES)[number];

const SEV: Record<
  Severity,
  { icon: typeof CircleX; color: string; label: string }
> = {
  8: { icon: CircleX, color: "text-red-500", label: "Fehler" },
  4: { icon: TriangleAlert, color: "text-amber-500", label: "Warnungen" },
  2: { icon: Info, color: "text-sky-500", label: "Infos" },
};

function basename(path: string) {
  return path.replace(/\/$/, "").split("/").pop() || path;
}

function dirOf(path: string) {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "";
}

function runQuickFix(path: string, marker: monaco.editor.IMarker) {
  openFileAt(path, {
    line: marker.startLineNumber,
    column: marker.startColumn,
    endColumn: marker.endColumn,
  });
  setTimeout(() => {
    const editors = getMonacoInstance()?.editor.getEditors() ?? [];
    const editor = editors.find((e) => e.hasTextFocus()) ?? editors[0];
    void editor?.getAction("editor.action.quickFix")?.run();
  }, 150);
}

export function ProblemsPanel() {
  const height = useProblemsPanel((s) => s.height);
  const setHeight = useProblemsPanel((s) => s.setHeight);
  const setOpen = useProblemsPanel((s) => s.setOpen);
  const byPath = useMarkersStore((s) => s.byPath);
  const total = useMarkersStore((s) => s.total);

  const [query, setQuery] = useState("");
  const [sevOn, setSevOn] = useState<Record<Severity, boolean>>({
    8: true,
    4: true,
    2: true,
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(byPath)
      .map(([path, markers]) => ({
        path,
        markers: markers.filter(
          (m) =>
            sevOn[m.severity as Severity] &&
            (!q ||
              m.message.toLowerCase().includes(q) ||
              path.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.markers.length > 0)
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [byPath, query, sevOn]);

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

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const iconBtn =
    "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground";

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
          Probleme
        </span>
        <div className="flex items-center gap-2 px-1">
          {SEVERITIES.map((sev) => {
            const { icon: Icon, color } = SEV[sev];
            const count =
              sev === 8
                ? total.errors
                : sev === 4
                  ? total.warnings
                  : total.infos;
            return (
              <button
                key={sev}
                onClick={() =>
                  setSevOn((s) => ({ ...s, [sev]: !s[sev] }))
                }
                title={SEV[sev].label}
                className={cn(
                  "flex items-center gap-1 rounded px-1 text-xs",
                  sevOn[sev] ? color : "text-muted-foreground/40",
                )}
              >
                <Icon className="size-3.5" />
                {count}
              </button>
            );
          })}
        </div>
        <div className="relative ml-2 flex min-w-0 flex-1 items-center">
          <ListFilter className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtern…"
            className="h-6 w-full rounded-md bg-foreground/[0.04] pl-7 pr-2 text-xs outline-none ring-1 ring-transparent focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => setOpen(false)}
          className={iconBtn}
          title="Panel schließen"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1 text-[13px]">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Keine Probleme erkannt.
          </div>
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.path);
            return (
              <div key={group.path}>
                <button
                  onClick={() => toggleCollapse(group.path)}
                  className="flex w-full items-center gap-1 px-2 py-1 text-left hover:bg-foreground/[0.04]"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 text-muted-foreground transition-transform",
                      !isCollapsed && "rotate-90",
                    )}
                  />
                  <span className="truncate font-medium">
                    {basename(group.path)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {dirOf(group.path)}
                  </span>
                  <span className="ml-auto rounded bg-foreground/8 px-1.5 text-xs text-muted-foreground">
                    {group.markers.length}
                  </span>
                </button>
                {!isCollapsed &&
                  group.markers.map((marker, i) => {
                    const { icon: Icon, color } =
                      SEV[marker.severity as Severity] ?? SEV[2];
                    return (
                      <div
                        key={`${marker.startLineNumber}:${marker.startColumn}:${i}`}
                        className="group/problem flex items-start gap-2 py-0.5 pl-7 pr-2 hover:bg-foreground/[0.04]"
                      >
                        <button
                          onClick={() =>
                            openFileAt(group.path, {
                              line: marker.startLineNumber,
                              column: marker.startColumn,
                              endColumn: marker.endColumn,
                            })
                          }
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        >
                          <Icon
                            className={cn("mt-0.5 size-3.5 shrink-0", color)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {marker.message}
                            {marker.source && (
                              <span className="ml-1.5 text-muted-foreground">
                                {marker.source}
                                {marker.code
                                  ? `(${typeof marker.code === "object" ? marker.code.value : marker.code})`
                                  : ""}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            [{marker.startLineNumber}:{marker.startColumn}]
                          </span>
                        </button>
                        <button
                          onClick={() => runQuickFix(group.path, marker)}
                          title="Quick Fix (Cmd+.)"
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover/problem:opacity-100"
                        >
                          <Wrench className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
