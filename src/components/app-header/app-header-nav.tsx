import { cn } from "@/lib/utils";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { Keyboard, Settings } from "lucide-react";
import { type CSSProperties } from "react";

export function AppHeaderNav() {
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const openFile = useWorkspaceStore((s) => s.openFile);

  const button = (route: string) =>
    cn(
      "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
      "hover:bg-foreground/10 hover:text-foreground",
      activeFile === pageTab(route) && "bg-foreground/10 text-foreground",
    );

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 pr-1.5"
      style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
    >
      <button
        type="button"
        aria-label="Shortcuts"
        title="Shortcuts"
        onClick={() => openFile(pageTab("/shortcuts"))}
        className={button("/shortcuts")}
      >
        <Keyboard className="size-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        onClick={() => openFile(pageTab("/settings"))}
        className={button("/settings")}
      >
        <Settings className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
