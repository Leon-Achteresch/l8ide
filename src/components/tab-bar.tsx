import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Pin, X } from "lucide-react";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

const tabClass =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-sm";

function store() {
  return useWorkspaceStore.getState();
}

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

function parentDir(path: string) {
  return path.split("/").slice(0, -1).pop();
}

function Tab({ path, showDir }: { path: string; showDir: boolean }) {
  const name = baseName(path);
  const dir = parentDir(path);
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
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => navigator.clipboard.writeText(path)}>
          Copy Path
        </ContextMenuItem>
        <ContextMenuItem onClick={copyRelativePath}>
          Copy Relative Path
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function TabBar() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const [dragged, setDragged] = useState<string | null>(null);
  const draggedPinned = useWorkspaceStore(
    (s) => dragged !== null && s.pinned.includes(dragged),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (tabs.length === 0) return null;

  const nameCounts = new Map<string, number>();
  for (const t of tabs) {
    const name = baseName(t);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const showDir = (path: string) => (nameCounts.get(baseName(path)) ?? 0) > 1;

  function handleDragStart(e: DragStartEvent) {
    setDragged(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragged(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const s = store();
    const path = String(active.id);
    const to = s.tabs.indexOf(String(over.id));
    if (to === -1) return;
    const crossing = s.pinned.includes(path)
      ? to >= s.pinned.length
      : to < s.pinned.length;
    if (crossing) s.togglePin(path);
    s.moveTab(path, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b bg-sidebar">
        <SortableContext items={tabs} strategy={horizontalListSortingStrategy}>
          {tabs.map((path) => (
            <Tab key={path} path={path} showDir={showDir(path)} />
          ))}
        </SortableContext>
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {dragged && (
          <div
            className={cn(
              tabClass,
              "cursor-grabbing bg-background text-foreground shadow-lg ring-1 ring-border",
            )}
          >
            {draggedPinned && <Pin className="size-3" />}
            <span className="whitespace-nowrap">{baseName(dragged)}</span>
            {showDir(dragged) && (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {parentDir(dragged)}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
