import { useEffect } from "react";
import { Loader2, Package, RefreshCw, ShieldAlert } from "lucide-react";
import { useDepDashboard } from "@/lib/dep-dashboard";
import { cn } from "@/lib/utils";

export function DepDashboardPage() {
  const deps = useDepDashboard((s) => s.deps);
  const loading = useDepDashboard((s) => s.loading);
  const checking = useDepDashboard((s) => s.checking);
  const auditing = useDepDashboard((s) => s.auditing);
  const audit = useDepDashboard((s) => s.audit);

  useEffect(() => {
    void useDepDashboard.getState().load();
  }, []);

  const prod = deps.filter((d) => !d.dev);
  const dev = deps.filter((d) => d.dev);
  const outdatedCount = deps.filter((d) => d.outdated).length;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-5">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">
            Abhängigkeiten
          </h1>
          <span className="text-xs text-muted-foreground">
            {prod.length} · {dev.length} dev
            {outdatedCount > 0 && ` · ${outdatedCount} veraltet`}
          </span>
          <button
            type="button"
            onClick={() => void useDepDashboard.getState().runSecurityAudit()}
            disabled={auditing || loading}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground/[0.06] px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
          >
            {auditing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ShieldAlert className="size-3" />
            )}
            Sicherheit prüfen
          </button>
          <button
            type="button"
            onClick={() => void useDepDashboard.getState().runOutdated()}
            disabled={checking || loading}
            className="inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground/[0.06] px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
          >
            {checking ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            Auf Updates prüfen
          </button>
        </div>
        {audit && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-foreground/[0.03] px-3 py-2 text-[11px]">
            <ShieldAlert
              className={cn(
                "size-3.5",
                audit.total === 0 ? "text-emerald-500" : "text-amber-500",
              )}
            />
            {audit.total === 0 ? (
              <span className="text-emerald-500">Keine bekannten Schwachstellen</span>
            ) : (
              <>
                {audit.critical > 0 && (
                  <span className="text-red-500">{audit.critical} kritisch</span>
                )}
                {audit.high > 0 && (
                  <span className="text-red-400">{audit.high} hoch</span>
                )}
                {audit.moderate > 0 && (
                  <span className="text-amber-500">{audit.moderate} mittel</span>
                )}
                {audit.low > 0 && (
                  <span className="text-muted-foreground">{audit.low} niedrig</span>
                )}
              </>
            )}
          </div>
        )}
        {loading ? (
          <p className="mt-4 text-xs text-muted-foreground">Lädt…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <DepTable title="Dependencies" deps={prod} />
            {dev.length > 0 && <DepTable title="devDependencies" deps={dev} />}
          </div>
        )}
      </div>
    </div>
  );
}

function DepTable({
  title,
  deps,
}: {
  title: string;
  deps: ReturnType<typeof useDepDashboard.getState>["deps"];
}) {
  if (deps.length === 0) return null;
  return (
    <div>
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="overflow-hidden rounded-lg bg-foreground/[0.02]">
        {deps.map((d) => (
          <div
            key={`${d.dev}:${d.name}`}
            className="flex items-center gap-3 px-3 py-1.5 text-xs"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-foreground">
              {d.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {d.declared}
            </span>
            <span
              className={cn(
                "w-16 shrink-0 text-right font-mono text-[11px]",
                d.installed ? "text-foreground/70" : "text-red-500",
              )}
            >
              {d.installed ?? "fehlt"}
            </span>
            <span className="w-20 shrink-0 text-right font-mono text-[11px]">
              {d.outdated && d.latest ? (
                <span className="text-amber-500">↑ {d.latest}</span>
              ) : d.outdated === false ? (
                <span className="text-emerald-500/70">aktuell</span>
              ) : (
                ""
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
