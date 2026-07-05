import { EditorGroup } from "@/components/editor-grid/editor-group";
import {
  parentDir,
  parseDragId,
  store,
  tabClass,
  tabName,
} from "@/components/tab-bar/lib";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { LayoutNode } from "@/lib/editor-groups";
import { cn } from "@/lib/utils";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Fragment, useState } from "react";

function renderNode(node: LayoutNode) {
  if (node.type === "leaf") return <EditorGroup id={node.id} />;
  return (
    <ResizablePanelGroup
      orientation={node.direction === "row" ? "horizontal" : "vertical"}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <ResizableHandle />}
          <ResizablePanel id={child.id} minSize={10}>
            {renderNode(child)}
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}

export function EditorGrid() {
  const layout = useWorkspaceStore((s) => s.layout);
  const [dragged, setDragged] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    setDragged(parseDragId(String(e.active.id)).path);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragged(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = parseDragId(String(active.id));
    const o = parseDragId(String(over.id));
    const toGroup = o.groupId;
    if (!toGroup) return;

    if (a.groupId === toGroup) {
      store().focusGroup(a.groupId);
      const s = store();
      if (o.kind !== "t") return;
      const to = s.tabs.indexOf(o.path);
      if (to === -1) return;
      const crossing = s.pinned.includes(a.path)
        ? to >= s.pinned.length
        : to < s.pinned.length;
      if (crossing) s.togglePin(a.path);
      s.moveTab(a.path, to);
      return;
    }

    const target = store().groups[toGroup];
    if (!target) return;
    const to = o.kind === "t" ? target.tabs.indexOf(o.path) : target.tabs.length;
    store().moveTabToGroup(
      a.path,
      a.groupId,
      toGroup,
      to === -1 ? target.tabs.length : to,
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      {renderNode(layout)}
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {dragged && (
          <div
            className={cn(
              tabClass,
              "max-w-none cursor-grabbing bg-background text-foreground shadow-md ring-1 ring-foreground/10",
            )}
          >
            <span className="whitespace-nowrap">{tabName(dragged)}</span>
            {!isPageTab(dragged) && (
              <span className="whitespace-nowrap text-[10px] text-muted-foreground/70">
                {parentDir(dragged)}
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
