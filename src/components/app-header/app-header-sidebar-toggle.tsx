import { SvgPathMorphing } from "@/blocks/svg-path-morphing";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function AppHeaderSidebarToggle() {
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);

  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      title="Toggle sidebar"
      onClick={toggleSidebar}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150",
        "hover:bg-foreground/8 hover:text-foreground",
        sidebarOpen && "text-foreground",
      )}
    >
      <SvgPathMorphing
        size={16}
        strokeWidth={2}
        isOpen={sidebarOpen}
        openIcon={PanelLeftClose}
        closedIcon={PanelLeftOpen}
      />
    </button>
  );
}
