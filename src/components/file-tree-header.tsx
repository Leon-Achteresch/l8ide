import { collapseAll, refreshTree } from "@/components/file-tree";
import { useFileSearchStore } from "@/components/file-search";
import { ProjectLogo } from "@/components/project-logo";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { basename } from "@/lib/fs-move";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { ChevronsDownUp, EyeOff, RefreshCw, Search } from "lucide-react";
import { motion } from "motion/react";

export function FileTreeHeader({ rootPath }: { rootPath: string }) {
  const name = basename(rootPath);
  const hideIgnored = useWorkspaceStore((s) => s.hideIgnored);

  return (
    <div className="sticky top-0 z-10 shrink-0 space-y-2 px-3 pb-2 pt-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <motion.div
          layout
          className="flex min-w-0 flex-1 items-center gap-2 "

          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        >
          <ProjectLogo rootPath={rootPath} className="size-5!" />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[13px] font-medium leading-tight text-foreground"
              title={name}
            >
              {name}
            </p>
          </div>

          <HeaderAction
            icon={EyeOff}
            label={
              hideIgnored
                ? "Von Git ignorierte einblenden (aktuell versteckt)"
                : "Von Git ignorierte ausblenden (aktuell gedimmt)"
            }
            active={hideIgnored}
            onClick={() => {
              useWorkspaceStore.getState().toggleHideIgnored();
              refreshTree();
            }}
          />
          <HeaderAction
            icon={ChevronsDownUp}
            label="Alle einklappen"
            onClick={collapseAll}
          />
          <HeaderAction
            icon={RefreshCw}
            label="Aktualisieren"
            onClick={refreshTree}
          />
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => useFileSearchStore.getState().setOpen(true)}
        className="group flex h-7 w-full items-center gap-2 rounded-lg bg-foreground/[0.04] px-2 text-left transition-colors duration-150 hover:bg-foreground/[0.07]"
      >
        <Search
          className="size-3.5 shrink-0 text-muted-foreground"
          strokeWidth={2}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          Datei suchen…
        </span>
        <Kbd className="h-4 shrink-0 px-1 text-[10px] text-muted-foreground/80">
          ⌘P
        </Kbd>
      </button>
    </div>
  );
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof ChevronsDownUp;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </Button>
  );
}
