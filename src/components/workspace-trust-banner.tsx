import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { isPathTrusted } from "@/lib/workspace-trust";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorkspaceTrustBanner() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const trustedFolders = useWorkspaceStore((s) => s.trustedFolders);
  const trustFolder = useWorkspaceStore((s) => s.trustFolder);
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (!rootPath || isPathTrusted(trustedFolders, rootPath) || dismissed === rootPath) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
      <ShieldAlert className="size-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Vertraust du den Autoren der Dateien in diesem Ordner?</p>
        <p className="truncate text-xs text-muted-foreground">
          Im eingeschränkten Modus ist das Terminal deaktiviert. {rootPath}
        </p>
      </div>
      <button
        type="button"
        onClick={() => trustFolder(rootPath)}
        className="shrink-0 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background hover:opacity-90"
      >
        Ordner vertrauen
      </button>
      <button
        type="button"
        onClick={() => setDismissed(rootPath)}
        className="shrink-0 rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
      >
        Eingeschränkt lassen
      </button>
    </div>
  );
}
