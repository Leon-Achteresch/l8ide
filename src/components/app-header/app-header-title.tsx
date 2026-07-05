import { useFileSearchStore } from "@/components/file-search";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { type CSSProperties } from "react";

export function AppHeaderTitle() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFileSearch = useFileSearchStore((s) => s.setOpen);
  const folderName = rootPath ? rootPath.split("/").pop() : null;

  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
      {folderName ? (
        <button
          type="button"
          onClick={() => openFileSearch(true)}
          title="Datei suchen"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          className="pointer-events-auto max-w-[min(40vw,20rem)] truncate rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          {folderName}
        </button>
      ) : (
        <span className="max-w-[min(40vw,20rem)] truncate text-sm font-medium text-muted-foreground">
          No folder open
        </span>
      )}
    </div>
  );
}
