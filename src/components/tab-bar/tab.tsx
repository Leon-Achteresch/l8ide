import { pageIconFor, parentDir, store, TAB_SPRING, tabClass, tabDragId, tabName } from "@/components/tab-bar/lib";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fileIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";
import { useViewStore } from "@/lib/view-store";
import { isPageTab, pageRoute, useWorkspaceStore } from "@/lib/workspace-store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin, X } from "lucide-react";
import { motion } from "motion/react";

export function Tab({
  groupId,
  path,
  showDir,
}: {
  groupId: string;
  path: string;
  showDir: boolean;
}) {
  const isPage = isPageTab(path);
  const name = tabName(path);
  const dir = isPage ? undefined : parentDir(path);
  const group = useWorkspaceStore((s) => s.groups[groupId]);
  const isActive = group?.activeFile === path;
  const isPinned = group?.pinned.includes(path) ?? false;
  const isPreview = group?.preview === path;
  const isLast = group?.tabs[group.tabs.length - 1] === path;
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const tabSizing = useViewStore((s) => s.tabSizing);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tabDragId(groupId, path) });

  function act(fn: (s: ReturnType<typeof store>) => void) {
    store().focusGroup(groupId);
    fn(store());
  }

  function copyRelativePath() {
    const root = store().rootPath;
    navigator.clipboard.writeText(
      root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path,
    );
  }

  const PageIcon = isPage ? pageIconFor(pageRoute(path)) : null;
  const FileIcon = !isPage && tabIcons ? fileIcon(name) : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={() => act((s) => s.setActiveFile(path))}
        onDoubleClick={() => act((s) => s.promoteTab(path))}
        onAuxClick={(e) => {
          if (e.button === 1 && !isPinned) act((s) => s.closeTab(path));
        }}
        className={cn(
          "group",
          tabClass,
          tabSizing === "fixed" && "w-36 max-w-none shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          isDragging && "opacity-30",
        )}
      >
        {isActive && (
          <motion.span
            layoutId={`tab-bar-indicator-${groupId}`}
            transition={TAB_SPRING}
            className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-foreground/8"
            aria-hidden
          />
        )}
        {!isActive && (
          <span
            className="absolute inset-0 -z-10 rounded-md opacity-0 transition-opacity duration-150 group-hover:bg-foreground/[0.05] group-hover:opacity-100"
            aria-hidden
          />
        )}
        {isPinned && (
          <button
            type="button"
            aria-label="Unpin tab"
            onClick={(e) => {
              e.stopPropagation();
              act((s) => s.togglePin(path));
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
          >
            <Pin className="size-3" strokeWidth={2} />
          </button>
        )}
        {PageIcon && <PageIcon className="size-3.5 shrink-0" strokeWidth={2} />}
        {FileIcon && <FileIcon className="size-3.5 shrink-0" />}
        <span className={cn("min-w-0 flex-1 truncate", isPreview && "italic")}>
          {name}
        </span>
        {showDir && dir && isActive && (
          <span className="min-w-0 max-w-[3.5rem] shrink truncate text-[10px] text-muted-foreground/70">
            {dir}
          </span>
        )}
        {!isPinned && (
          <button
            type="button"
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              act((s) => s.closeTab(path));
            }}
            className={cn(
              "ml-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground",
              isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100",
            )}
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onClick={() => act((s) => s.closeTab(path))}>
          Close
        </ContextMenuItem>
        <ContextMenuItem onClick={() => act((s) => s.closeOthers(path))}>
          Close Others
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isLast}
          onClick={() => act((s) => s.closeToRight(path))}
        >
          Close to the Right
        </ContextMenuItem>
        <ContextMenuItem onClick={() => act((s) => s.closeAll())}>
          Close All
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => act((s) => s.togglePin(path))}>
          {isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        {!isPage && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => navigator.clipboard.writeText(path)}
            >
              Copy Path
            </ContextMenuItem>
            <ContextMenuItem onClick={copyRelativePath}>
              Copy Relative Path
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
