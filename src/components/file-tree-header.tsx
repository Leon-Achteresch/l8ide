import { collapseAll, refreshTree } from "@/components/file-tree";
import { ProjectLogo } from "@/components/project-logo";
import { Button } from "@/components/ui/button";
import { basename } from "@/lib/fs-move";
import { ChevronsDownUp, RefreshCw } from "lucide-react";

export function FileTreeHeader({ rootPath }: { rootPath: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-muted/20 px-2 py-1.5">
      <ProjectLogo rootPath={rootPath} />
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium"
        title={basename(rootPath)}
      >
        {basename(rootPath)}
      </span>
      <div
        role="toolbar"
        aria-label="Dateibaum-Aktionen"
        className="flex shrink-0 items-center gap-0.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={collapseAll}
          title="Alle einklappen"
        >
          <ChevronsDownUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={refreshTree}
          title="Aktualisieren"
        >
          <RefreshCw />
        </Button>
      </div>
    </div>
  );
}
