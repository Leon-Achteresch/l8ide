import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FileDiff, GitCommit, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFileCompare } from "@/lib/file-compare";
import { languageOf } from "@/lib/language-of";
import {
  listSnapshots,
  openSnapshotDiff,
  restoreContent,
  restoreSnapshot,
  useLocalHistoryDialog,
  type Snapshot,
} from "@/lib/local-history";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { readTextFile } from "@tauri-apps/plugin-fs";

type FileLogEntry = {
  hash: string;
  short: string;
  time: number;
  author: string;
  subject: string;
};

type TimelineItem =
  | { kind: "snapshot"; time: number; snap: Snapshot }
  | { kind: "commit"; time: number; commit: FileLogEntry };

function timeLabel(t: number) {
  return new Date(t).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function commitContent(root: string, rel: string, hash: string) {
  return invoke<string>("repo_file_content_at", {
    path: root,
    file: rel,
    treeish: hash,
  });
}

export function LocalHistoryDialog() {
  const path = useLocalHistoryDialog((s) => s.path);
  const close = useLocalHistoryDialog((s) => s.close);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [items, setItems] = useState<TimelineItem[] | null>(null);

  const rel =
    path && rootPath && path.startsWith(`${rootPath}/`)
      ? path.slice(rootPath.length + 1)
      : null;

  useEffect(() => {
    if (!path) {
      setItems(null);
      return;
    }
    let cancelled = false;
    const snapsP = listSnapshots(path);
    const logP =
      rel && rootPath
        ? invoke<FileLogEntry[]>("git_file_log", {
            path: rootPath,
            file: rel,
          }).catch(() => [] as FileLogEntry[])
        : Promise.resolve([] as FileLogEntry[]);
    void Promise.all([snapsP, logP]).then(([snaps, log]) => {
      if (cancelled) return;
      const merged: TimelineItem[] = [
        ...snaps.map((snap) => ({ kind: "snapshot" as const, time: snap.time, snap })),
        ...log.map((commit) => ({
          kind: "commit" as const,
          time: commit.time * 1000,
          commit,
        })),
      ].sort((a, b) => b.time - a.time);
      setItems(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [path, rel, rootPath]);

  const name = path?.split("/").pop() ?? "";

  const commitDiff = async (c: FileLogEntry) => {
    if (!path || !rel || !rootPath) return;
    const [old, current] = await Promise.all([
      commitContent(rootPath, rel, c.hash),
      readTextFile(path).catch(() => ""),
    ]);
    useFileCompare
      .getState()
      .openCompare(
        { label: `${name} @ ${c.short}`, text: old },
        { label: "Aktuell", text: current },
        languageOf(path),
      );
  };

  const commitRestore = async (c: FileLogEntry) => {
    if (!path || !rel || !rootPath) return;
    await restoreContent(path, await commitContent(rootPath, rel, c.hash));
    toast.success(`Stand von ${c.short} wiederhergestellt`);
    close();
  };

  return (
    <Dialog open={path !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-muted-foreground" />
            Timeline · {name}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {items === null ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : items.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Noch keine Historie. Snapshots entstehen automatisch beim
              Speichern.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={
                  item.kind === "snapshot"
                    ? `s${item.time}`
                    : `c${item.commit.hash}`
                }
                className="group flex h-8 items-center gap-2 rounded-md px-2 text-xs hover:bg-foreground/[0.04]"
              >
                {item.kind === "snapshot" ? (
                  <History className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <GitCommit className="size-3 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {item.kind === "snapshot"
                    ? timeLabel(item.time)
                    : item.commit.subject}
                </span>
                <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground">
                  {item.kind === "commit"
                    ? `${item.commit.short} · ${timeLabel(item.time)}`
                    : "Snapshot"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    item.kind === "snapshot"
                      ? path && void openSnapshotDiff(path, item.snap)
                      : void commitDiff(item.commit)
                  }
                  className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <FileDiff className="size-3" />
                  Diff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!path) return;
                    const run =
                      item.kind === "snapshot"
                        ? restoreSnapshot(path, item.snap).then(() => {
                            toast.success("Stand wiederhergestellt");
                            close();
                          })
                        : commitRestore(item.commit);
                    void run.catch((e) => toast.error(String(e)));
                  }}
                  className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <RotateCcw className="size-3" />
                  Zurück
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
