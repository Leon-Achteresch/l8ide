import { FileTree } from "@/components/file-tree";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { open } from "@tauri-apps/plugin-dialog";

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
        //Content für spätere Funktionen
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
