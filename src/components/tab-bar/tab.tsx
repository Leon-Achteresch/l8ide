import { pageIcons, parentDir, store, tabClass, tabName } from "@/components/tab-bar/lib";
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

const INDICATOR_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.55,
} as const;

function TabCornerLeft() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -left-3 bottom-0 [filter:drop-shadow(-1.2px_-0.5px_1px_rgba(0,0,0,0.10))]"
    >
      <path d="M15 15H0C8.28427 15 15 8.28427 15 0V15Z" fill="var(--background)" />
    </svg>
  );
}

function TabCornerRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -right-3 bottom-0 [filter:drop-shadow(1.2px_-0.5px_1px_rgba(0,0,0,0.10))]"
    >
      <path
        d="M0 15L6.5568e-07 0C2.93563e-07 8.28427 6.71573 15 15 15L0 15Z"
        fill="var(--background)"
      />
    </svg>
  );
}

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
            ? "text-foreground"
            : "rounded-md text-muted-foreground hover:bg-accent/50",
          isDragging && "opacity-30",
        )}
      >
        {isActive && (
          <motion.span
            layoutId="tab-bar-indicator"
            transition={INDICATOR_SPRING}
            className="absolute inset-0 -z-10"
            aria-hidden
          >
            <span className="absolute inset-0 rounded-t-xl bg-background [box-shadow:-1px_-1px_1px_0.1px_rgba(0,0,0,0.08),1px_-1px_1px_0.1px_rgba(0,0,0,0.08)]" />
            <TabCornerLeft />
            <TabCornerRight />
          </motion.span>
        )}
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
        {isPage &&
          (() => {
            const PageIcon = pageIcons[pageRoute(path)];
            return PageIcon ? <PageIcon className="size-3.5" /> : null;
          })()}
        {!isPage &&
          tabIcons &&
          (() => {
            const Icon = fileIcon(name);
            return Icon ? <Icon className="size-3.5 shrink-0" /> : null;
          })()}
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
