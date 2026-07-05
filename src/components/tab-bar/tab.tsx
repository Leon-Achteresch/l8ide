import { pageIcons, parentDir, store, TAB_SPRING, tabClass, tabName } from "@/components/tab-bar/lib";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fileIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";
import { isPageTab, pageRoute, useWorkspaceStore } from "@/lib/workspace-store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin, X } from "lucide-react";
import { motion } from "motion/react";

export function Tab({ path, showDir }: { path: string; showDir: boolean }) {
  const isPage = isPageTab(path);
  const name = tabName(path);
  const dir = isPage ? undefined : parentDir(path);
  const isActive = useWorkspaceStore((s) => s.activeFile === path);
  const isPinned = useWorkspaceStore((s) => s.pinned.includes(path));
  const isLast = useWorkspaceStore((s) => s.tabs[s.tabs.length - 1] === path);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: path });

  function copyRelativePath() {
    const root = store().rootPath;
    navigator.clipboard.writeText(
      root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path,
    );
  }

  const PageIcon = isPage ? pageIcons[pageRoute(path)] : null;
  const FileIcon = !isPage && tabIcons ? fileIcon(name) : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...attributes}
        {...listeners}
        onClick={() => store().setActiveFile(path)}
        onAuxClick={(e) => {
          if (e.button === 1 && !isPinned) store().closeTab(path);
        }}
        className={cn(
          "group",
          tabClass,
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          isDragging && "opacity-30",
        )}
      >
        {isActive && (
          <motion.span
            layoutId="tab-bar-indicator"
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
              store().togglePin(path);
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
          >
            <Pin className="size-3" strokeWidth={2} />
          </button>
        )}
        {PageIcon && <PageIcon className="size-3.5 shrink-0" strokeWidth={2} />}
        {FileIcon && <FileIcon className="size-3.5 shrink-0" />}
        <span className="min-w-0 truncate">{name}</span>
        {showDir && dir && (
          <span className="shrink-0 text-[10px] text-muted-foreground/70">{dir}</span>
        )}
        {!isPinned && (
          <button
            type="button"
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              store().closeTab(path);
            }}
            className={cn(
              "ml-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-all duration-150 hover:bg-foreground/8 hover:text-foreground",
              isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100",
            )}
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onClick={() => store().closeTab(path)}>
          Close
        </ContextMenuItem>
        <ContextMenuItem onClick={() => store().closeOthers(path)}>
          Close Others
        </ContextMenuItem>
        <ContextMenuItem
          disabled={isLast}
          onClick={() => store().closeToRight(path)}
        >
          Close to the Right
        </ContextMenuItem>
        <ContextMenuItem onClick={() => store().closeAll()}>
          Close All
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => store().togglePin(path)}>
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
