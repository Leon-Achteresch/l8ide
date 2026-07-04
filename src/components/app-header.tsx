import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/window-controls";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Link, useRouterState } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Keyboard, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { type CSSProperties } from "react";
import { SvgPathMorphing } from "@/blocks/svg-path-morphing";

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

const IS_WINDOWS =
  typeof navigator !== "undefined" && /Win/i.test(navigator.platform);

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const setRootPath = useWorkspaceStore((s) => s.setRootPath);
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);

  const { resolvedTheme } = useTheme();

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRootPath(selected);
  }

  return (
    <header
      data-tauri-drag-region
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
      className={cn(
        "relative z-10 flex h-10 shrink-0 select-none items-stretch border-b",
        IS_MAC ? "pl-[86px]" : "pl-2",
      )}
    >
      <div className="flex items-center gap-2">
        <img
          src={resolvedTheme === "dark" ? "/logo_black.png" : "/logo_white.png"}
          alt="Logo"
          className="h-5 w-auto"
        />
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={toggleSidebar}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
            "hover:bg-foreground/10 hover:text-foreground",
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

        <Button variant="ghost" size="icon" onClick={pickFolder}>
          <FolderOpen className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <span className="truncate text-sm font-medium">
          {rootPath ? rootPath.split("/").pop() : "No folder open"}
        </span>
      </div>

      <div
        className="flex shrink-0 items-center gap-0.5 pr-1.5"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <Link
          to="/shortcuts"
          aria-label="Shortcuts"
          title="Shortcuts"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
            "hover:bg-foreground/10 hover:text-foreground",
            pathname.startsWith("/shortcuts") &&
              "bg-foreground/10 text-foreground",
          )}
        >
          <Keyboard className="size-4" strokeWidth={2} />
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-150",
            "hover:bg-foreground/10 hover:text-foreground",
            pathname.startsWith("/settings") &&
              "bg-foreground/10 text-foreground",
          )}
        >
          <Settings className="size-4" strokeWidth={2} />
        </Link>
      </div>

      {IS_WINDOWS && <WindowControls />}
    </header>
  );
}
