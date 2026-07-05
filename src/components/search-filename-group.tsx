import { fileIcon } from "@/lib/file-icons";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, File } from "lucide-react";
import { useState } from "react";

export function SearchFilenameGroup({
  paths,
  rootPath,
}: {
  paths: string[];
  rootPath: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const openFile = useWorkspaceStore((s) => s.openFile);
  if (paths.length === 0) return null;
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left",
          "hover:bg-sidebar-accent",
        )}
      >
        {collapsed ? (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
          Dateinamen
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
          {paths.length}
        </span>
      </button>
      {!collapsed && (
        <div className="ml-[18px] border-l border-sidebar-border pl-1.5">
          {paths.map((path) => {
            const name = path.split("/").pop() ?? path;
            const dir = path.startsWith(`${rootPath}/`)
              ? path.slice(rootPath.length + 1, path.lastIndexOf("/"))
              : "";
            const Icon = fileIcon(name) ?? File;
            return (
              <button
                key={path}
                type="button"
                onClick={() => openFile(path)}
                className={cn(
                  "flex w-full items-start gap-1.5 rounded-md px-1 py-0.5 text-left",
                  "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="mt-0.5 size-3.5 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs leading-tight">
                    {name}
                  </span>
                  {dir && (
                    <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                      {dir}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
