import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { FolderOpen, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Status = { available: boolean; distributions: string[]; error: string | null };

export function WslFolderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [distribution, setDistribution] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setError("");
    void invoke<Status>("wsl_status").then((next) => {
      if (!active) return;
      setStatus(next);
      setDistribution((current) => next.distributions.includes(current) ? current : next.distributions[0] ?? "");
    }).catch((cause) => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !distribution) return;
    let active = true;
    setPath("");
    setError("");
    void invoke<string>("wsl_home", { distribution })
      .then((home) => { if (active) { setPath(home); setError(""); } })
      .catch((cause) => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [open, distribution]);

  async function openFolder() {
    if (!distribution || !path || busy) return;
    setBusy(true);
    setError("");
    try {
      const root = await invoke<string>("wsl_open_folder", { distribution, linuxPath: path.trim() });
      useWorkspaceStore.getState().setRootPath(root);
      onOpenChange(false);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm"><Monitor className="size-4" />WSL-Ordner öffnen</DialogTitle>
        </DialogHeader>
        {!status ? (
          <p className="text-sm text-muted-foreground">Suche WSL-Distributionen…</p>
        ) : !status.available ? (
          <p className="text-sm text-muted-foreground">WSL ist nicht verfügbar. {status.error || "Installiere WSL und mindestens eine Linux-Distribution."}</p>
        ) : status?.distributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Linux-Distribution gefunden. Installiere zuerst eine WSL-Distribution.</p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-medium">
              <span>Distribution</span>
              <select value={distribution} onChange={(event) => setDistribution(event.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm">
                {status?.distributions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium">
              <span>Linux-Verzeichnis</span>
              <Input value={path} onChange={(event) => setPath(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void openFolder(); }} placeholder="/home/user/projekt" className="font-mono text-xs" spellCheck={false} />
            </label>
            <p className="text-xs text-muted-foreground">Für Linux-Werkzeuge sollten Projekte im Linux-Dateisystem liegen, etwa unter /home.</p>
            <button type="button" disabled={!distribution || !path.startsWith("/") || busy} onClick={() => void openFolder()} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"><FolderOpen className="size-3.5" />{busy ? "Öffne…" : "Ordner öffnen"}</button>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
