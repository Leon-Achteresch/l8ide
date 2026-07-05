import { collapseAll, refreshTree } from "@/components/file-tree";
import { ProjectLogo } from "@/components/project-logo";
import { Button } from "@/components/ui/button";
import { basename } from "@/lib/fs-move";
import { cn } from "@/lib/utils";
import { ChevronsDownUp, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

export function FileTreeHeader({ rootPath }: { rootPath: string }) {
  const name = basename(rootPath);

  return (
    <div className="sticky top-0 z-10 shrink-0 px-3 pb-2 pt-3 backdrop-blur-md">
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
    </div>
  );
}

function HeaderAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ChevronsDownUp;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
      )}
      onClick={onClick}
      title={label}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </Button>
  );
}
