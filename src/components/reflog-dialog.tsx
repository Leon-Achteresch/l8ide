import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReflog, type ReflogEntry } from "@/lib/reflog-store";

function actionLabel(action: string): string {
  const verb = action.split(":")[0];
  const map: Record<string, string> = {
    commit: "Commit",
    "commit (amend)": "Amend",
    "commit (initial)": "Erster Commit",
    checkout: "Checkout",
    reset: "Reset",
    merge: "Merge",
    rebase: "Rebase",
    "cherry-pick": "Cherry-Pick",
    pull: "Pull",
    clone: "Clone",
  };
  return map[action] ?? map[verb] ?? verb;
}

export function ReflogDialog() {
  const open = useReflog((s) => s.open);
  const setOpen = useReflog((s) => s.setOpen);
  const entries = useReflog((s) => s.entries);
  const loading = useReflog((s) => s.loading);

  const confirmReset = (entry: ReflogEntry) =>
    toast.warning(`Auf ${entry.short_hash} zurücksetzen?`, {
      description:
        "git reset --hard verwirft uncommittete Änderungen. Über das Reflog wieder auffindbar.",
      action: {
        label: "Zurücksetzen",
        onClick: () => void useReflog.getState().resetTo(entry),
      },
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-muted-foreground" />
            Git-Verlauf (Reflog) · Undo Everything
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : entries.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Kein Reflog verfügbar.
            </p>
          ) : (
            entries.map((e, i) => (
              <div
                key={`${e.selector}:${i}`}
                className="group flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-foreground/[0.04]"
              >
                <span className="w-16 shrink-0 font-mono text-[11px] text-violet-500">
                  {e.short_hash}
                </span>
                <span className="w-20 shrink-0 text-[10px] font-medium text-muted-foreground">
                  {actionLabel(e.action)}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground/85">
                  {e.subject}
                </span>
                <button
                  type="button"
                  title="Auf diesen Stand zurücksetzen (hard)"
                  onClick={() => confirmReset(e)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
