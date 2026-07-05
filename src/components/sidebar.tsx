import { FileTree } from "@/components/file-tree";
import { FileTreeHeader } from "@/components/file-tree-header";
import { SearchPanel } from "@/components/search-panel/search-panel";
import { SidebarActions } from "@/components/sidebar-actions";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const sidebarMode = useWorkspaceStore((s) => s.sidebarMode);
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const [resizing, setResizing] = useState(false);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let x = startX;
    let frame = 0;
    function onMove(ev: PointerEvent) {
      x = ev.clientX;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setSidebarWidth(startWidth + x - startX);
        });
      }
    }
    function onUp() {
      if (frame) cancelAnimationFrame(frame);
      setSidebarWidth(startWidth + x - startX);
      setResizing(false);
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
          transition={
            resizing
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 40 }
          }
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
                  <FileTreeHeader rootPath={rootPath} />
                  <FileTree rootPath={rootPath} />
                </div>
                {sidebarMode === "Search" && (
                  <SearchPanel rootPath={rootPath} />
                )}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-start p-2 text-sm text-muted-foreground">
                Open a folder to get started.
              </div>
            )}
            <SidebarActions />
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
