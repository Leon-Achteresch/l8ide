import { useState } from "react";
import { Check, FolderGit2, Lock, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorktrees } from "@/lib/worktree-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorktreeDialog() {
  const open = useWorktrees((s) => s.open);
  const setOpen = useWorktrees((s) => s.setOpen);
  const entries = useWorktrees((s) => s.entries);
  const loading = useWorktrees((s) => s.loading);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [dir, setDir] = useState("");
  const [branch, setBranch] = useState("");

  const current = rootPath?.replace(/\/+$/, "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FolderGit2 className="size-4 text-muted-foreground" />
            Git-Worktrees
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : (
            entries.map((w) => {
              const active = current === w.path.replace(/\/+$/, "");
              return (
                <div
                  key={w.path}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-foreground/[0.04]"
                >
                  {active ? (
                    <Check className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => useWorktrees.getState().switchTo(w.path)}
                    className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default"
                  >
                    <span className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                      {w.branch ?? "(detached)"}
                      {w.is_main && (
                        <span className="text-[9px] font-normal text-muted-foreground">
                          main
                        </span>
                      )}
                      {w.is_locked && <Lock className="size-2.5 text-amber-500" />}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {w.path}
                    </span>
                  </button>
                  {!w.is_main && (
                    <button
                      type="button"
                      title="Worktree entfernen"
                      onClick={() => void useWorktrees.getState().remove(w.path)}
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-1.5 border-t pt-3">
          <Input
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="Neuer Worktree-Pfad (../feature-x)"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-xs"
          />
          <Input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch"
            spellCheck={false}
            className="h-8 w-32 font-mono text-xs"
          />
          <button
            type="button"
            disabled={!dir.trim() || !branch.trim()}
            onClick={() => {
              void useWorktrees.getState().add(dir.trim(), branch.trim());
              setDir("");
              setBranch("");
            }}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
