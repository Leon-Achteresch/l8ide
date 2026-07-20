import { useState } from "react";
import { Plus, Tag, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTags } from "@/lib/tags-store";

export function TagsDialog() {
  const open = useTags((s) => s.open);
  const setOpen = useTags((s) => s.setOpen);
  const tags = useTags((s) => s.tags);
  const loading = useTags((s) => s.loading);
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    void useTags.getState().create(name.trim());
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4 text-muted-foreground" />
            Git-Tags
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Neuer Tag auf HEAD (z.B. v1.2.0)"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-xs"
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={create}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : tags.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">Keine Tags.</p>
          ) : (
            tags.map((t) => (
              <div
                key={t.name}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-foreground/[0.04]"
              >
                <Tag className="size-3 shrink-0 text-muted-foreground" />
                <span className="shrink-0 font-mono font-medium text-foreground">
                  {t.name}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {t.short_hash}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                  {t.subject}
                </span>
                <button
                  type="button"
                  title="Tag löschen"
                  onClick={() => void useTags.getState().remove(t.name)}
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
