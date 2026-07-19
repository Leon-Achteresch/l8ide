import { useEffect, useMemo, useState } from "react";
import { Ban, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  initClipboardCapture,
  pasteFromHistory,
  useClipboardHistory,
} from "@/lib/clipboard-history";
import { useWorkspaceStore } from "@/lib/workspace-store";

function timeLabel(t: number) {
  return new Date(t).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClipboardHistoryDialog() {
  const open = useClipboardHistory((s) => s.dialogOpen);
  const setOpen = useClipboardHistory((s) => s.setDialogOpen);
  const entries = useClipboardHistory((s) => s.entries);
  const clear = useClipboardHistory((s) => s.clear);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    initClipboardCapture();
  }, []);

  useEffect(() => {
    if (!open) setFilter("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return q
      ? entries.filter((e) => e.text.toLowerCase().includes(q))
      : entries;
  }, [entries, filter]);

  const relPath = (p: string | null) =>
    p && rootPath && p.startsWith(`${rootPath}/`)
      ? p.slice(rootPath.length + 1)
      : p;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ClipboardList className="size-4 text-muted-foreground" />
            Zwischenablage-Verlauf
            <button
              type="button"
              title="Verlauf löschen"
              onClick={clear}
              className="ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              <Ban className="size-3.5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtern…"
          className="h-8 text-xs"
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              {entries.length === 0
                ? "Noch nichts kopiert. Kopien aus dem Editor landen hier."
                : "Keine Treffer."}
            </p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  pasteFromHistory(entry);
                }}
                className="block w-full rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 text-left transition-colors hover:bg-foreground/[0.07]"
              >
                <pre className="max-h-16 overflow-hidden whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground">
                  {entry.text.length > 300
                    ? `${entry.text.slice(0, 300)}…`
                    : entry.text}
                </pre>
                <p className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                  {entry.path && (
                    <span className="truncate">{relPath(entry.path)}</span>
                  )}
                  <span className="ml-auto shrink-0 tabular-nums">
                    {timeLabel(entry.time)}
                  </span>
                </p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
