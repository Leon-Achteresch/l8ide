import { useState } from "react";
import { Archive, ArrowDownToLine, Copy, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStashStore } from "@/lib/stash-store";

export function StashDialog() {
  const open = useStashStore((s) => s.open);
  const setOpen = useStashStore((s) => s.setOpen);
  const entries = useStashStore((s) => s.entries);
  const loading = useStashStore((s) => s.loading);
  const [message, setMessage] = useState("");
  const [untracked, setUntracked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Archive className="size-4 text-muted-foreground" />
            Stashes
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1.5">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void useStashStore.getState().push(message.trim(), untracked);
                setMessage("");
              }
            }}
            placeholder="Aktuelle Änderungen stashen als… (⏎)"
            className="h-8 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => setUntracked((v) => !v)}
            title="Untracked Dateien einschließen"
            className={
              untracked
                ? "h-8 rounded-md bg-foreground/10 px-2 text-[10px] font-medium text-foreground"
                : "h-8 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:bg-foreground/8"
            }
          >
            +untracked
          </button>
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : entries.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Keine Stashes. Änderungen oben zwischenlagern.
            </p>
          ) : (
            entries.map((s) => (
              <div
                key={s.index}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-foreground/[0.04]"
              >
                <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground">
                  #{s.index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{s.subject}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {s.branch} · {s.date}
                  </p>
                </div>
                <button
                  type="button"
                  title="Anwenden & behalten (apply)"
                  onClick={() => void useStashStore.getState().apply(s.index)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <Copy className="size-3" />
                </button>
                <button
                  type="button"
                  title="Anwenden & entfernen (pop)"
                  onClick={() => void useStashStore.getState().pop(s.index)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <ArrowDownToLine className="size-3" />
                </button>
                <button
                  type="button"
                  title="Verwerfen (drop)"
                  onClick={() => void useStashStore.getState().drop(s.index)}
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
