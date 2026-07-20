import { useEffect, useState } from "react";
import { Cloud, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRemotes } from "@/lib/remotes-store";

function RemoteRow({ name, url }: { name: string; url: string }) {
  const [draft, setDraft] = useState(url);
  useEffect(() => setDraft(url), [url]);
  const dirty = draft.trim() !== url;
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-foreground/[0.04]">
      <span className="w-16 shrink-0 font-mono text-xs font-medium text-foreground">
        {name}
      </span>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty)
            void useRemotes.getState().setUrl(name, draft);
        }}
        spellCheck={false}
        className="h-7 flex-1 font-mono text-[11px]"
      />
      {dirty && (
        <button
          type="button"
          onClick={() => void useRemotes.getState().setUrl(name, draft)}
          className="h-7 shrink-0 rounded-md bg-foreground/[0.06] px-2 text-[11px] font-medium text-foreground hover:bg-foreground/10"
        >
          Speichern
        </button>
      )}
    </div>
  );
}

export function RemotesDialog() {
  const open = useRemotes((s) => s.open);
  const setOpen = useRemotes((s) => s.setOpen);
  const remotes = useRemotes((s) => s.remotes);
  const loading = useRemotes((s) => s.loading);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Cloud className="size-4 text-muted-foreground" />
            Git-Remotes
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-60 space-y-0.5 overflow-y-auto">
          {loading ? (
            <p className="py-3 text-xs text-muted-foreground">Lädt…</p>
          ) : remotes.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              Keine Remotes konfiguriert.
            </p>
          ) : (
            remotes.map((r) => (
              <RemoteRow key={r.name} name={r.name} url={r.url} />
            ))
          )}
        </div>
        <div className="flex gap-1.5 border-t pt-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (origin)"
            spellCheck={false}
            className="h-8 w-28 font-mono text-xs"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (git@… oder https://…)"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-xs"
          />
          <button
            type="button"
            disabled={!name.trim() || !url.trim()}
            onClick={() => {
              void useRemotes.getState().add(name, url);
              setName("");
              setUrl("");
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
