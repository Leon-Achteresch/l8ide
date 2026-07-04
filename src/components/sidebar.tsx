import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { FileTree } from "@/components/file-tree";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const setRootPath = useWorkspaceStore((s) => s.setRootPath);

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRootPath(selected);
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center justify-between border-b p-2">
        <span className="truncate text-sm font-medium">
          {rootPath ? rootPath.split("/").pop() : "No folder open"}
        </span>
        <Button variant="ghost" size="icon" onClick={pickFolder}>
          <FolderOpen className="size-4" />
        </Button>
      </div>
      {rootPath ? (
        <FileTree rootPath={rootPath} />
      ) : (
        <div className="p-2 text-sm text-muted-foreground">
          Open a folder to get started.
        </div>
      )}
    </aside>
  );
}
