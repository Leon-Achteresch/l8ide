import { parentDir, store, tabClass, tabName } from "@/components/tab-bar/lib";
import { Tab } from "@/components/tab-bar/tab";
import { cn } from "@/lib/utils";
import { isPageTab, pageRoute, useWorkspaceStore } from "@/lib/workspace-store";
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
} from "@dnd-kit/sortable";
import { useRouter } from "@tanstack/react-router";
import { Pin } from "lucide-react";
import { useEffect, useState } from "react";

export function TabBar() {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const router = useRouter();
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

  useEffect(() => {
    const target =
      activeFile && isPageTab(activeFile) ? pageRoute(activeFile) : "/";
    if (router.state.location.pathname !== target) {
      router.history.push(target);
    }
  }, [activeFile, router]);

  if (tabs.length === 0) return null;

  const nameCounts = new Map<string, number>();
  for (const t of tabs) {
    const name = tabName(t);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const showDir = (path: string) =>
    !isPageTab(path) && (nameCounts.get(tabName(path)) ?? 0) > 1;

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
      <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b bg-sidebar overflow-y-hidden">
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
            <span className="whitespace-nowrap">{tabName(dragged)}</span>
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
