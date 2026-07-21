import { Loader2, PlayCircle, RotateCw, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { loadCoverage, runCoverage, useCoverage } from "@/lib/coverage";
import { overallPct } from "@/lib/coverage-core";
import { openFileAt } from "@/lib/monaco-navigation";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

function pctColor(pct: number): string {
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 50) return "text-amber-500";
  return "text-rose-500";
}

function barColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export function CoveragePage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const byPath = useCoverage((s) => s.byPath);

  const rows = useMemo(() => {
    const root = rootPath?.replace(/\/+$/, "");
    return Object.entries(byPath)
      .map(([path, cov]) => ({
        path,
        rel: root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path,
        pct: cov.pct,
        covered: cov.covered,
        total: cov.total,
      }))
      .sort((a, b) => a.pct - b.pct);
  }, [byPath, rootPath]);

  const overall = overallPct(byPath);
  const empty = rows.length === 0;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Coverage</h1>
          {!empty && (
            <span className={cn("text-xs font-medium", pctColor(overall))}>
              {overall}% gesamt · {rows.length} Dateien
            </span>
          )}
          <button
            type="button"
            onClick={() => void runCoverage()}
            title="Coverage-Lauf (vitest/jest --coverage)"
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <PlayCircle className="size-3.5" />
            Lauf
          </button>
          <button
            type="button"
            onClick={() => void loadCoverage()}
            title="coverage-final.json neu laden"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>

        {empty ? (
          <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.04] px-3 py-4 text-xs text-muted-foreground">
            <Loader2 className="size-4" />
            Keine Coverage geladen. „Lauf" erzeugt sie, oder lade eine
            vorhandene coverage-final.json.
          </div>
        ) : (
          <div className="space-y-0.5">
            {rows.map((r) => (
              <button
                key={r.path}
                type="button"
                onClick={() => openFileAt(r.path, { line: 1, column: 1 })}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-foreground/[0.04]"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {r.rel}
                </span>
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-foreground/[0.08]">
                  <div
                    className={cn("h-full rounded-full", barColor(r.pct))}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right font-mono text-[11px]",
                    pctColor(r.pct),
                  )}
                >
                  {r.pct}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
