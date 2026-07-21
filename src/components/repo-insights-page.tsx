import { invoke } from "@tauri-apps/api/core";
import { Activity, Code2, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";

type LanguageStat = {
  language: string;
  color: string;
  bytes: number;
  percent: number;
};
type ContributorStat = {
  name: string;
  email: string;
  commits: number;
  insertions: number;
  deletions: number;
};
type ActivityBucket = {
  bucket: string;
  commits: number;
  insertions: number;
  deletions: number;
};

export function RepoInsightsPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [langs, setLangs] = useState<LanguageStat[] | null>(null);
  const [authors, setAuthors] = useState<ContributorStat[]>([]);
  const [activity, setActivity] = useState<ActivityBucket[]>([]);

  useEffect(() => {
    const root = rootPath?.replace(/\/+$/, "");
    if (!root) return;
    let cancelled = false;
    void Promise.all([
      invoke<LanguageStat[]>("repo_language_stats", { path: root }).catch(
        () => [],
      ),
      invoke<ContributorStat[]>("repo_contributor_stats", {
        path: root,
        sinceDays: 365,
        limit: 10,
      }).catch(() => []),
      invoke<ActivityBucket[]>("repo_activity_buckets", {
        path: root,
        sinceDays: 90,
        bucket: "week",
      }).catch(() => []),
    ]).then(([l, c, a]) => {
      if (cancelled) return;
      setLangs(l);
      setAuthors(c);
      setActivity(a);
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  if (!langs) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Analysiere Repository…
      </div>
    );
  }

  const maxCommits = Math.max(1, ...activity.map((b) => b.commits));

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl space-y-7 px-6 py-6">
        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Code2 className="size-3.5" />
            Sprachen
          </p>
          {langs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Daten.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full">
                {langs.map((l) => (
                  <div
                    key={l.language}
                    style={{ width: `${l.percent}%`, background: l.color }}
                    title={`${l.language} ${l.percent.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {langs.slice(0, 10).map((l) => (
                  <span
                    key={l.language}
                    className="flex items-center gap-1.5 text-[11px] text-foreground"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: l.color }}
                    />
                    {l.language}
                    <span className="text-muted-foreground">
                      {l.percent.toFixed(1)}%
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="size-3.5" />
            Aktivität (12 Wochen)
          </p>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Commits.</p>
          ) : (
            <div className="flex h-20 items-end gap-1">
              {activity.map((b) => (
                <div
                  key={b.bucket}
                  className="flex-1 rounded-t bg-violet-500/70"
                  style={{ height: `${(b.commits / maxCommits) * 100}%` }}
                  title={`${b.bucket}: ${b.commits} Commits, +${b.insertions}/-${b.deletions}`}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" />
            Top-Beitragende (letztes Jahr)
          </p>
          {authors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Daten.</p>
          ) : (
            <div className="overflow-hidden rounded-lg bg-foreground/[0.02]">
              {authors.map((a) => (
                <div
                  key={a.email}
                  className="flex items-center gap-3 px-3 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {a.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {a.commits} Commits
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono text-[10px]">
                    <span className="text-emerald-500">+{a.insertions}</span>{" "}
                    <span className="text-red-500">−{a.deletions}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
