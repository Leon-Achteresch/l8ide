import { useFileSearchStore } from "@/components/file-search";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { type CSSProperties } from "react";

export function AppHeaderTitle() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const openFileSearch = useFileSearchStore((s) => s.setOpen);
  const folderName = rootPath ? rootPath.split("/").pop() : null;

  return (
    <div className="flex flex-1 items-center justify-center">
      {folderName ? (
        <button
          type="button"
          onClick={() => openFileSearch(true)}
          title="Datei suchen"
          style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
          className="max-w-full truncate rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          {folderName}
        </button>
      ) : (
        <span className="truncate text-sm font-medium text-muted-foreground">
          No folder open
        </span>
      )}
    </div>
  );
}
