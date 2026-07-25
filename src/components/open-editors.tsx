import { ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fileIcon } from "@/lib/file-icons";
import {
  copyPath,
  copyRelativePath,
  openWithDefaultApp,
  revealInOs,
} from "@/lib/path-actions";
import { cn } from "@/lib/utils";
import {
  isPageTab,
  PAGES,
  pageRoute,
  useWorkspaceStore,
} from "@/lib/workspace-store";

const useOpenEditorsUi = create<{ open: boolean; toggle: () => void }>()(
  persist(
    (set) => ({
      open: true,
      toggle: () => set((s) => ({ open: !s.open })),
    }),
    { name: "open-editors-ui" },
  ),
);

function labelFor(tab: string): string {
  if (isPageTab(tab)) {
    const route = pageRoute(tab);
    return PAGES[route] ?? route.split("/").filter(Boolean).join(" · ");
  }
  return tab.split("/").pop() ?? tab;
}

export function OpenEditors() {
  const groups = useWorkspaceStore((s) => s.groups);
  const activeGroupId = useWorkspaceStore((s) => s.activeGroupId);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const open = useOpenEditorsUi((s) => s.open);
  const toggle = useOpenEditorsUi((s) => s.toggle);

  const groupIds = Object.keys(groups).filter(
    (id) => groups[id].tabs.length > 0,
  );
  const total = groupIds.reduce((n, id) => n + groups[id].tabs.length, 0);
  if (total === 0) return null;

  const activate = (gid: string, tab: string) => {
    const ws = useWorkspaceStore.getState();
    if (gid !== ws.activeGroupId) ws.focusGroup(gid);
    useWorkspaceStore.getState().setActiveFile(tab);
  };

  const closeOne = (gid: string, tab: string) => {
    const ws = useWorkspaceStore.getState();
    if (gid !== ws.activeGroupId) ws.focusGroup(gid);
    useWorkspaceStore.getState().closeTab(tab);
  };

  return (
    <div className="shrink-0 border-b border-sidebar-border pb-1">
      <button
        type="button"
        onClick={toggle}
        className="flex h-6 w-full items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        >
          <ChevronRight className="size-3" strokeWidth={2} />
        </motion.span>
        Offene Editoren
        <span className="font-normal">{total}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
            className="overflow-hidden"
          >
            <div className="max-h-40 overflow-y-auto px-1.5">
              {groupIds.map((gid, gi) => (
                <div key={gid}>
                  {groupIds.length > 1 && (
                    <p className="px-2 pt-1 text-[10px] text-muted-foreground">
                      Gruppe {gi + 1}
                    </p>
                  )}
                  {groups[gid].tabs.map((tab) => {
                    const isActive =
                      gid === activeGroupId && tab === activeFile;
                    const FileIcon =
                      tabIcons && !isPageTab(tab)
                        ? fileIcon(labelFor(tab))
                        : null;
                    const isFile = !isPageTab(tab);
                    return (
                      <ContextMenu key={`${gid}:${tab}`}>
                        <ContextMenuTrigger
                          className={cn(
                            "group flex h-6 items-center gap-1.5 rounded-md pl-2 pr-1 text-xs",
                            isActive
                              ? "bg-foreground/[0.06] text-foreground"
                              : "text-foreground/85 hover:bg-foreground/[0.04]",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => activate(gid, tab)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                          >
                            {FileIcon && <FileIcon className="size-3.5 shrink-0" />}
                            <span className="truncate">{labelFor(tab)}</span>
                          </button>
                          <button
                            type="button"
                            title="Schließen"
                            onClick={() => closeOne(gid, tab)}
                            className="flex size-4.5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                          >
                            <X className="size-3" />
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="min-w-48">
                          <ContextMenuItem onClick={() => activate(gid, tab)}>
                            Öffnen
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => closeOne(gid, tab)}>
                            Schließen
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => {
                              const ws = useWorkspaceStore.getState();
                              if (gid !== ws.activeGroupId) ws.focusGroup(gid);
                              useWorkspaceStore.getState().closeOthers(tab);
                            }}
                          >
                            Andere schließen
                          </ContextMenuItem>
                          <ContextMenuItem
                            onClick={() => useWorkspaceStore.getState().closeAll()}
                          >
                            Alle schließen
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() =>
                              useWorkspaceStore.getState().togglePin(tab)
                            }
                          >
                            Anheften / Lösen
                          </ContextMenuItem>
                          {isFile && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => copyPath(tab)}>
                                Pfad kopieren
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => copyRelativePath(tab)}
                              >
                                Relativen Pfad kopieren
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => revealInOs(tab)}>
                                Im Finder zeigen
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => openWithDefaultApp(tab)}
                              >
                                Mit Standardprogramm öffnen
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
