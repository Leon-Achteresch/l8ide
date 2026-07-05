import { stripDropId, tabDragId, tabName } from "@/components/tab-bar/lib";
import { Tab } from "@/components/tab-bar/tab";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { Fragment } from "react";

const EMPTY: string[] = [];

export function TabBar({ groupId }: { groupId: string }) {
  const tabs = useWorkspaceStore((s) => s.groups[groupId]?.tabs ?? EMPTY);
  const pinned = useWorkspaceStore((s) => s.groups[groupId]?.pinned ?? EMPTY);
  const { setNodeRef } = useDroppable({ id: stripDropId(groupId) });

  const nameCounts = new Map<string, number>();
  for (const t of tabs) {
    const name = tabName(t);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  const showDir = (path: string) =>
    !isPageTab(path) && (nameCounts.get(tabName(path)) ?? 0) > 1;

  return (
    <SortableContext
      items={tabs.map((t) => tabDragId(groupId, t))}
      strategy={horizontalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden py-1 no-scrollbar"
      >
        {tabs.map((path, i) => {
          const prevPinned = i > 0 && pinned.includes(tabs[i - 1]);
          const showSep =
            pinned.length > 0 && prevPinned && !pinned.includes(path);
          return (
            <Fragment key={path}>
              {showSep && (
                <div
                  className="mx-0.5 h-4 w-px shrink-0 bg-border/60"
                  aria-hidden
                />
              )}
              <Tab groupId={groupId} path={path} showDir={showDir(path)} />
            </Fragment>
          );
        })}
      </div>
    </SortableContext>
  );
}
