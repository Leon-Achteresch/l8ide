import { invoke } from "@tauri-apps/api/core";
import { GitCommit, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { computeGitGraph } from "@/lib/git-graph-core";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Commit = {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  subject: string;
  tags: string[];
  parents: string[];
};

const PAGE = 100;
const ROW_H = 30;
const GAP = 14;
const PAD_X = 12;
const NODE_R = 4;
const LANE_COLORS = [
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#d946ef",
  "#84cc16",
];

const laneX = (col: number) => PAD_X + col * GAP;
const rowY = (i: number) => i * ROW_H + ROW_H / 2;

async function refresh() {
  await useGitStore.getState().refresh();
}

export function GitHistoryPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [commits, setCommits] = useState<Commit[] | null>(null);

  const load = () => {
    const root = rootPath?.replace(/\/+$/, "");
    if (!root) return;
    void invoke<Commit[]>("repo_log_page", { path: root, skip: 0, limit: PAGE })
      .then(setCommits)
      .catch(() => setCommits([]));
  };

  useEffect(load, [rootPath]);

  const run = async (
    label: string,
    fn: () => Promise<unknown>,
    reload = true,
  ) => {
    try {
      await fn();
      toast.success(label);
      await refresh();
      if (reload) load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const root = rootPath?.replace(/\/+$/, "") ?? "";

  const graph = useMemo(
    () =>
      computeGitGraph(
        (commits ?? []).map((c) => ({ hash: c.hash, parents: c.parents ?? [] })),
      ),
    [commits],
  );
  const graphW = laneX(graph.width - 1) + PAD_X;

  if (!commits) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Lade Verlauf…
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <GitCommit className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Verlauf</h1>
          <span className="text-xs text-muted-foreground">
            {commits.length} Commits · Rechtsklick für Aktionen
          </span>
        </div>
        <div className="relative">
          <svg
            width={graphW}
            height={commits.length * ROW_H}
            className="pointer-events-none absolute left-0 top-0"
            aria-hidden
          >
            {graph.rows.map((r, i) =>
              r.edges.map((e, k) => {
                const x1 = laneX(e.from);
                const y1 = rowY(i - 1);
                const x2 = laneX(e.to);
                const y2 = rowY(i);
                const my = (y1 + y2) / 2;
                return (
                  <path
                    key={`${i}-${k}`}
                    d={`M ${x1} ${y1} C ${x1} ${my} ${x2} ${my} ${x2} ${y2}`}
                    fill="none"
                    stroke={LANE_COLORS[e.color]}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                );
              }),
            )}
            {graph.rows.map((r, i) => (
              <circle
                key={i}
                cx={laneX(r.col)}
                cy={rowY(i)}
                r={NODE_R}
                fill={LANE_COLORS[r.color]}
              />
            ))}
          </svg>
          {commits.map((c) => (
            <ContextMenu key={c.hash}>
              <ContextMenuTrigger>
                <div
                  className="flex items-center gap-3 rounded-md pr-2 hover:bg-foreground/[0.04]"
                  style={{ height: ROW_H, paddingLeft: graphW }}
                >
                  <span className="shrink-0 font-mono text-[11px] text-violet-500">
                    {c.short_hash}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {c.subject}
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {c.author} · {c.date}
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem
                  onClick={() =>
                    void navigator.clipboard.writeText(c.hash).then(() =>
                      toast.success("Hash kopiert"),
                    )
                  }
                >
                  Hash kopieren
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() =>
                    void run("Cherry-Pick angewendet", () =>
                      invoke("git_cherry_pick", {
                        path: root,
                        commits: [c.hash],
                        mainline: null,
                      }),
                    )
                  }
                >
                  Cherry-Pick auf aktuellen Branch
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() =>
                    void run("Commit revertiert", () =>
                      invoke("git_revert_commit", {
                        path: root,
                        commit: c.hash,
                        mergeMainline: null,
                      }),
                    )
                  }
                >
                  Revert (rückgängig als neuer Commit)
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => {
                    const name = prompt(`Tag-Name für ${c.short_hash}:`);
                    if (name?.trim())
                      void run("Tag erstellt", () =>
                        invoke("git_tag_commit", {
                          path: root,
                          name: name.trim(),
                          commit: c.hash,
                        }),
                      );
                  }}
                >
                  Tag auf diesen Commit
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
    </div>
  );
}
