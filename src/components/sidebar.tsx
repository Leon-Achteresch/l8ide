import { FileTree } from "@/components/file-tree";
import { SearchPanel } from "@/components/search-panel/search-panel";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { AnimatePresence, motion } from "motion/react";

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const sidebarMode = useWorkspaceStore((s) => s.sidebarMode);
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

  return (
    <AnimatePresence initial={false}>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: sidebarWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="relative flex h-full shrink-0 flex-col overflow-hidden border-r bg-sidebar"
        >
          <div style={{ width: sidebarWidth }} className="flex h-full flex-col">
            {rootPath ? (
              <>
                <div
                  className={cn(
                    "flex min-h-0 flex-1 flex-col",
                    sidebarMode !== "FileTree" && "hidden",
                  )}
                >
                  <FileTree rootPath={rootPath} />
                </div>
                {sidebarMode === "Search" && <SearchPanel rootPath={rootPath} />}
              </>
            ) : (
              <div className="p-2 text-sm text-muted-foreground">
                Open a folder to get started.
              </div>
            )}
          </div>
          <div
            onPointerDown={startResize}
            className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize"
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
