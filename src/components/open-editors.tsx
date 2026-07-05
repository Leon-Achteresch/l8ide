import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  pageIconFor,
  parentDir,
  store,
  tabName,
} from "@/components/tab-bar/lib";
import { fileIcon } from "@/lib/file-icons";
import { isPageTab, pageRoute, useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function OpenEditors() {
  const groups = useWorkspaceStore((s) => s.groups);
  const activeGroupId = useWorkspaceStore((s) => s.activeGroupId);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const [open, setOpen] = useState(true);

  const groupIds = Object.keys(groups);
  const total = groupIds.reduce(
    (n, id) => n + (groups[id]?.tabs.length ?? 0),
    0,
  );
  const multi = groupIds.filter((id) => (groups[id]?.tabs.length ?? 0) > 0)
    .length > 1;

  if (total === 0) return null;

  return (
    <div className="shrink-0 border-b border-foreground/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn("size-3 transition-transform", open && "rotate-90")}
        />
        <span>Geöffnete Editoren</span>
        <span className="ml-auto tabular-nums">{total}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto pb-1">
          {groupIds.map((gid, gi) => {
            const g = groups[gid];
            if (!g || g.tabs.length === 0) return null;
            return (
              <div key={gid}>
                {multi && (
                  <div className="px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    Gruppe {gi + 1}
                  </div>
                )}
                {g.tabs.map((path) => {
                  const isActive =
                    gid === activeGroupId && activeFile === path;
                  const isPage = isPageTab(path);
                  const name = tabName(path);
                  const dir = isPage ? undefined : parentDir(path);
                  const PageIcon = isPage ? pageIconFor(pageRoute(path)) : null;
                  const FileIcon = !isPage && tabIcons ? fileIcon(name) : null;
                  return (
                    <div
                      key={path}
                      className={cn(
                        "group/oe flex items-center gap-1.5 px-2 py-1 text-[13px]",
                        isActive
                          ? "bg-foreground/[0.06] text-foreground"
                          : "text-foreground/85 hover:bg-foreground/[0.04]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          store().focusGroup(gid);
                          store().setActiveFile(path);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      >
                        {PageIcon ? (
                          <PageIcon className="size-3.5 shrink-0" strokeWidth={2} />
                        ) : FileIcon ? (
                          <FileIcon className="size-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                        <span className="min-w-0 truncate">{name}</span>
                        {dir && (
                          <span className="ml-auto max-w-[6rem] shrink truncate text-[10px] text-muted-foreground/70">
                            {dir}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Editor schließen"
                        onClick={() => {
                          store().focusGroup(gid);
                          store().closeTab(path);
                        }}
                        className={cn(
                          "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground",
                          isActive
                            ? "opacity-70 hover:opacity-100"
                            : "opacity-0 group-hover/oe:opacity-70",
                        )}
                      >
                        <X className="size-3" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
