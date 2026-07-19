import { FileTree } from "@/components/file-tree";
import { FileTreeHeader } from "@/components/file-tree-header";
import { OutlinePanel } from "@/components/outline-panel";
import { ScmPanel } from "@/components/scm-panel/scm-panel";
import { SearchPanel } from "@/components/search-panel/search-panel";
import { SidebarActions } from "@/components/sidebar-actions";
import { SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { AnimatePresence, motion } from "motion/react";
import { FolderOpen } from "lucide-react";
import { useState } from "react";

const MODE_VARIANTS = {
  enter: { opacity: 0, x: -12, filter: "blur(4px)" },
  center: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: { opacity: 0, x: 12, filter: "blur(4px)" },
} as const;

export function Sidebar() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const sidebarMode = useWorkspaceStore((s) => s.sidebarMode);
  const setSidebarWidth = useWorkspaceStore((s) => s.setSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const [resizeHover, setResizeHover] = useState(false);

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
          transition={resizing ? { duration: 0 } : SPRING_PANEL}
          className="relative flex h-full shrink-0 flex-col overflow-hidden bg-sidebar/90 shadow-[inset_-1px_0_0_0_var(--sidebar-border)] backdrop-blur-2xl"
        >
          <div style={{ width: sidebarWidth }} className="flex h-full flex-col">
            <div className="flex min-h-0 flex-1 flex-col">
              {rootPath ? (
                <AnimatePresence mode="wait" initial={false}>
                  {sidebarMode === "FileTree" ? (
                    <motion.div
                      key="explorer"
                      variants={MODE_VARIANTS}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <FileTreeHeader rootPath={rootPath} />
                      <FileTree rootPath={rootPath} />
                    </motion.div>
                  ) : sidebarMode === "Search" ? (
                    <motion.div
                      key="search"
                      variants={MODE_VARIANTS}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <SearchPanel rootPath={rootPath} />
                    </motion.div>
                  ) : sidebarMode === "Outline" ? (
                    <motion.div
                      key="outline"
                      variants={MODE_VARIANTS}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <OutlinePanel />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="scm"
                      variants={MODE_VARIANTS}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <ScmPanel rootPath={rootPath} />
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_PANEL}
                  className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
                >
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground/[0.04] ring-1 ring-foreground/[0.06]">
                    <FolderOpen className="size-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Kein Projekt geöffnet</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Öffne einen Ordner, um den Explorer zu nutzen.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            <SidebarActions />
          </div>

          <motion.div
            onPointerDown={startResize}
            onHoverStart={() => setResizeHover(true)}
            onHoverEnd={() => setResizeHover(false)}
            className="absolute inset-y-0 -right-1 z-20 flex w-2.5 cursor-col-resize items-center justify-center"
          >
            <motion.div
              animate={{
                height: resizeHover || resizing ? "40%" : "0%",
                opacity: resizeHover || resizing ? 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className={cn(
                "w-0.5 rounded-full",
                resizing ? "bg-primary" : "bg-foreground/25",
              )}
            />
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
