import { ArrowDown, ArrowUp, GitBranch } from "lucide-react";
import { type CSSProperties, useEffect } from "react";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function AppHeaderBranch() {
  const branch = useGitStore((s) => s.branch);
  const ahead = useGitStore((s) => s.ahead);
  const behind = useGitStore((s) => s.behind);
  const refresh = useGitStore((s) => s.refresh);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const setSidebarMode = useWorkspaceStore((s) => s.setSidebarMode);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);

  useEffect(() => {
    void refresh();
  }, [rootPath, refresh]);

  if (!rootPath || !branch) return null;

  return (
    <button
      type="button"
      title="Quellcodeverwaltung"
      onClick={() => {
        setSidebarMode("Scm");
        if (!sidebarOpen) toggleSidebar();
      }}
      style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      className="flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
    >
      <GitBranch className="size-3.5" />
      <span className="max-w-[140px] truncate">{branch}</span>
      {behind > 0 && (
        <span className="flex items-center gap-0.5">
          <ArrowDown className="size-3" />
          {behind}
        </span>
      )}
      {ahead > 0 && (
        <span className="flex items-center gap-0.5">
          <ArrowUp className="size-3" />
          {ahead}
        </span>
      )}
    </button>
  );
}
