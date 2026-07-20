import { GitDiffPage } from "@/components/scm-panel/git-diff-page";
import { FileComparePage } from "@/components/file-compare-page";
import { MergeConflictPage } from "@/components/scm-panel/merge-conflict-page";
import { DepGraphPage } from "@/components/dep-graph-page";
import { ProjectGraphPage } from "@/components/project-graph-page";
import { DepDashboardPage } from "@/components/dep-dashboard-page";
import { ProcessDashboardPage } from "@/components/process-dashboard-page";
import { DesignTokensPage } from "@/components/design-tokens-page";
import { SearchEditorPage } from "@/components/search-editor-page";
import { store } from "@/components/tab-bar/lib";
import { TabBar } from "@/components/tab-bar/tab-bar";
import { collectLeaves } from "@/lib/editor-groups";
import { cn } from "@/lib/utils";
import {
  isPageTab,
  pageRoute,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { SettingsPage } from "@/routes/settings";
import { ShortcutsPage } from "@/routes/shortcuts";
import {
  SquareSplitHorizontal,
  SquareSplitVertical,
  X,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useMemo } from "react";

const FileEditor = lazy(() =>
  import("@/components/file-editor").then((m) => ({ default: m.FileEditor })),
);

const PAGE_COMPONENTS: Record<string, () => React.JSX.Element> = {
  "/settings": SettingsPage,
  "/shortcuts": ShortcutsPage,
  "/project-graph": ProjectGraphPage,
  "/dependencies": DepDashboardPage,
  "/processes": ProcessDashboardPage,
  "/design-tokens": DesignTokensPage,
};

const CONTROL =
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground";

function GroupContent({ activeFile }: { activeFile: string | null }) {
  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a file to start editing.
      </div>
    );
  }
  if (isPageTab(activeFile)) {
    const route = pageRoute(activeFile);
    if (route.startsWith("/diff/")) {
      return (
        <div className="h-full">
          <GitDiffPage route={route} />
        </div>
      );
    }
    if (route.startsWith("/deps/")) {
      return (
        <div className="h-full">
          <DepGraphPage route={route} />
        </div>
      );
    }
    if (route.startsWith("/search-editor/")) {
      return (
        <div className="h-full">
          <SearchEditorPage route={route} />
        </div>
      );
    }
    if (route.startsWith("/conflict/")) {
      return (
        <div className="h-full">
          <MergeConflictPage route={route} />
        </div>
      );
    }
    if (route.startsWith("/compare/")) {
      return (
        <div className="h-full">
          <FileComparePage route={route} />
        </div>
      );
    }
    const Page = PAGE_COMPONENTS[route];
    return Page ? (
      <div className="h-full overflow-auto">
        <Page />
      </div>
    ) : null;
  }
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <FileEditor path={activeFile} />
    </Suspense>
  );
}

export function EditorGroup({ id }: { id: string }) {
  const activeFile = useWorkspaceStore((s) => s.groups[id]?.activeFile ?? null);
  const hasTabs = useWorkspaceStore((s) => (s.groups[id]?.tabs.length ?? 0) > 0);
  const isActive = useWorkspaceStore((s) => s.activeGroupId === id);
  const layout = useWorkspaceStore((s) => s.layout);
  const multiple = useMemo(() => collectLeaves(layout).length > 1, [layout]);
  const showBar = hasTabs || multiple;

  return (
    <div
      onPointerDownCapture={() => store().focusGroup(id)}
      className="flex h-full w-full min-h-0 min-w-0 flex-col bg-background"
    >
      {showBar && (
        <div
          className={cn(
            "flex h-9 min-w-0 shrink-0 items-center gap-0.5 overflow-hidden border-b px-2",
            isActive && multiple
              ? "border-b-border/60 bg-sidebar"
              : "border-b-border/40 bg-sidebar/50",
          )}
        >
          <TabBar groupId={id} />
          <div className="flex shrink-0 items-center gap-0.5 pl-1">
            <Control
              icon={SquareSplitHorizontal}
              label="Split right"
              onClick={() => {
                store().focusGroup(id);
                store().splitGroup("row");
              }}
            />
            <Control
              icon={SquareSplitVertical}
              label="Split down"
              onClick={() => {
                store().focusGroup(id);
                store().splitGroup("col");
              }}
            />
            {multiple && (
              <Control
                icon={X}
                label="Close group"
                onClick={() => store().closeGroup(id)}
              />
            )}
          </div>
        </div>
      )}
      <div className="min-h-0 min-w-0 flex-1">
        <GroupContent activeFile={activeFile} />
      </div>
    </div>
  );
}

function Control({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={CONTROL}>
      <Icon className="size-3.5" strokeWidth={2} />
    </button>
  );
}
