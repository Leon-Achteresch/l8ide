import { invoke } from "@tauri-apps/api/core";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

type Commit = {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  subject: string;
};

const LIMIT = 200;

function Section({
  title,
  icon: Icon,
  accent,
  commits,
  empty,
}: {
  title: string;
  icon: typeof ArrowDownToLine;
  accent: string;
  commits: Commit[];
  empty: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("size-4", accent)} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {commits.length}
        </span>
      </div>
      {commits.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-0.5">
          {commits.map((c) => (
            <div
              key={c.hash}
              className="flex items-baseline gap-3 rounded-md px-2 py-1 hover:bg-foreground/[0.04]"
            >
              <span className="shrink-0 font-mono text-[11px] text-violet-500">
                {c.short_hash}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {c.subject}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {c.author} · {c.date}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function GitSyncPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const hasUpstream = useGitStore((s) => s.hasUpstream);
  const branch = useGitStore((s) => s.branch);
  const [incoming, setIncoming] = useState<Commit[] | null>(null);
  const [outgoing, setOutgoing] = useState<Commit[] | null>(null);

  const load = useCallback(() => {
    const root = rootPath?.replace(/\/+$/, "");
    if (!root) return;
    setIncoming(null);
    setOutgoing(null);
    void invoke<Commit[]>("repo_range_log", {
      path: root,
      range: "HEAD..@{upstream}",
      limit: LIMIT,
    })
      .then(setIncoming)
      .catch(() => setIncoming([]));
    void invoke<Commit[]>("repo_range_log", {
      path: root,
      range: "@{upstream}..HEAD",
      limit: LIMIT,
    })
      .then(setOutgoing)
      .catch(() => setOutgoing([]));
  }, [rootPath]);

  useEffect(load, [load]);

  const loading = incoming === null || outgoing === null;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground">
            Ein- & Ausgehende Änderungen
          </h1>
          {branch && (
            <span className="font-mono text-xs text-muted-foreground">
              {branch}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            title="Aktualisieren"
            className="ml-auto flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>

        {!hasUpstream ? (
          <p className="rounded-lg bg-foreground/[0.04] px-3 py-4 text-xs text-muted-foreground">
            Kein Upstream konfiguriert. Pushe den Branch mit „set-upstream", um
            ein- und ausgehende Commits zu sehen.
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Lade…
          </div>
        ) : (
          <div className="space-y-6">
            <Section
              title="Eingehend"
              icon={ArrowDownToLine}
              accent="text-sky-500"
              commits={incoming}
              empty="Nichts einzuholen — du bist auf dem neuesten Stand."
            />
            <Section
              title="Ausgehend"
              icon={ArrowUpFromLine}
              accent="text-emerald-500"
              commits={outgoing}
              empty="Nichts zu pushen — keine lokalen Commits voraus."
            />
          </div>
        )}
      </div>
    </div>
  );
}
