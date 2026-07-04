import { FileTree } from "@/components/file-tree";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    function onMove(ev: PointerEvent) {
      setSidebarWidth(startWidth + ev.clientX - startX);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    }
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  if (!sidebarOpen) return null;

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r bg-sidebar"
      style={{ width: sidebarWidth }}
    >
      <div className="flex items-center justify-between border-b p-2" />
      {rootPath ? (
        <FileTree rootPath={rootPath} />
      ) : (
        <div className="p-2 text-sm text-muted-foreground">
          Open a folder to get started.
        </div>
      )}
      <div
        onPointerDown={startResize}
        className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize"
      />
    </aside>
  );
}
