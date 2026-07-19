import { useState } from "react";
import { Layers, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkContexts } from "@/lib/workspace-contexts";
import { useWorkspaceStore } from "@/lib/workspace-store";

function timeLabel(t: number) {
  return new Date(t).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkContextsDialog() {
  const open = useWorkContexts((s) => s.dialogOpen);
  const setOpen = useWorkContexts((s) => s.setDialogOpen);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const contexts = useWorkContexts((s) =>
    rootPath ? (s.byRoot[rootPath] ?? []) : [],
  );
  const save = useWorkContexts((s) => s.save);
  const apply = useWorkContexts((s) => s.apply);
  const remove = useWorkContexts((s) => s.remove);
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    save(name);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Layers className="size-4 text-muted-foreground" />
            Arbeitskontexte
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1.5">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Aktuellen Stand speichern als… (⏎)"
            className="h-8 text-xs"
          />
          <button
            type="button"
            title="Speichern"
            disabled={!name.trim()}
            onClick={submit}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground disabled:opacity-40"
          >
            <Save className="size-4" />
          </button>
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {contexts.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Noch keine Kontexte. Speichere Tabs, Splits und Sidebar-Modus
              unter einem Namen — z.B. pro Ticket.
            </p>
          ) : (
            contexts.map((ctx) => (
              <div
                key={ctx.name}
                className="group flex h-9 items-center gap-2 rounded-md px-2 hover:bg-foreground/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => apply(ctx.name)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-xs font-medium text-foreground">
                    {ctx.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {ctx.snapshot.tabs.length} Tab(s) · {timeLabel(ctx.time)}
                  </span>
                </button>
                <button
                  type="button"
                  title="Mit aktuellem Stand überschreiben"
                  onClick={() => save(ctx.name)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <Save className="size-3" />
                </button>
                <button
                  type="button"
                  title="Löschen"
                  onClick={() => remove(ctx.name)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
