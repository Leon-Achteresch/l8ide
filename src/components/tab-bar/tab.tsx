import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { Pin, X } from "lucide-react";
import { parentDir, store, tabClass, tabName } from "@/components/tab-bar/lib";

export function Tab({ path, showDir }: { path: string; showDir: boolean }) {
  const isPage = isPageTab(path);
  const name = tabName(path);
  const dir = isPage ? undefined : parentDir(path);
  const isActive = useWorkspaceStore((s) => s.activeFile === path);
  const isPinned = useWorkspaceStore((s) => s.pinned.includes(path));
  const isLast = useWorkspaceStore((s) => s.tabs[s.tabs.length - 1] === path);
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
          isActive
            ? "bg-background text-foreground"
            : "text-muted-foreground hover:bg-accent/50",
          isDragging && "opacity-30",
        )}
      >
        {isPinned && (
          <button
            type="button"
            aria-label="Unpin tab"
            onClick={(e) => {
              e.stopPropagation();
              store().togglePin(path);
            }}
            className="rounded p-0.5 hover:bg-accent"
          >
            <Pin className="size-3" />
          </button>
        )}
        <span className="whitespace-nowrap">{name}</span>
        {showDir && dir && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {dir}
          </span>
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
              "rounded p-0.5 opacity-0 hover:bg-accent group-hover:opacity-100",
              isActive && "opacity-100",
            )}
          >
            <X className="size-3.5" />
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
