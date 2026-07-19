import { useEffect, useState } from "react";
import { FileDiff, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listSnapshots,
  openSnapshotDiff,
  restoreSnapshot,
  useLocalHistoryDialog,
  type Snapshot,
} from "@/lib/local-history";

function timeLabel(t: number) {
  return new Date(t).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LocalHistoryDialog() {
  const path = useLocalHistoryDialog((s) => s.path);
  const close = useLocalHistoryDialog((s) => s.close);
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);

  useEffect(() => {
    if (!path) {
      setSnapshots(null);
      return;
    }
    let cancelled = false;
    void listSnapshots(path).then((list) => {
      if (!cancelled) setSnapshots(list);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const name = path?.split("/").pop() ?? "";

  return (
    <Dialog open={path !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-muted-foreground" />
            Lokale Historie · {name}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {snapshots === null ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : snapshots.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Noch keine Snapshots. Sie entstehen automatisch beim Speichern.
            </p>
          ) : (
            snapshots.map((s) => (
              <div
                key={s.time}
                className="group flex h-8 items-center gap-2 rounded-md px-2 text-xs hover:bg-foreground/[0.04]"
              >
                <span className="min-w-0 flex-1 truncate tabular-nums text-foreground">
                  {timeLabel(s.time)}
                </span>
                <button
                  type="button"
                  onClick={() => path && void openSnapshotDiff(path, s)}
                  className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <FileDiff className="size-3" />
                  Diff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!path) return;
                    void restoreSnapshot(path, s)
                      .then(() => {
                        toast.success("Stand wiederhergestellt");
                        close();
                      })
                      .catch((e) => toast.error(String(e)));
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <RotateCcw className="size-3" />
                  Wiederherstellen
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
