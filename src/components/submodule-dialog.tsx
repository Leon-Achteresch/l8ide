import { Boxes, Loader2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubmodules } from "@/lib/submodule-store";

export function SubmoduleDialog() {
  const open = useSubmodules((s) => s.open);
  const setOpen = useSubmodules((s) => s.setOpen);
  const entries = useSubmodules((s) => s.entries);
  const loading = useSubmodules((s) => s.loading);
  const busy = useSubmodules((s) => s.busy);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Boxes className="size-4 text-muted-foreground" />
            Submodule
            <button
              type="button"
              disabled={busy || loading || entries.length === 0}
              onClick={() => void useSubmodules.getState().update()}
              className="ml-auto inline-flex h-6 items-center gap-1 rounded-md bg-foreground/[0.06] px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              Alle aktualisieren
            </button>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : entries.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Keine Submodule (`.gitmodules`) im Projekt.
            </p>
          ) : (
            entries.map((s) => (
              <div
                key={s.path}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-foreground/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                    {s.path}
                    {s.branch && (
                      <span className="text-[9px] font-normal text-muted-foreground">
                        {s.branch}
                      </span>
                    )}
                    {s.behind_count != null && s.behind_count > 0 && (
                      <span className="text-[9px] text-amber-500">
                        ↓{s.behind_count}
                      </span>
                    )}
                    {s.local_changes != null && s.local_changes > 0 && (
                      <span className="text-[9px] text-amber-500">
                        {s.local_changes}±
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {s.commit.slice(0, 8)} · {s.url}
                  </p>
                </div>
                <button
                  type="button"
                  title="Dieses Submodul aktualisieren"
                  onClick={() => void useSubmodules.getState().update(s.path)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <RefreshCw className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
