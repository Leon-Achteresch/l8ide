import { Link, useRouterState } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { type CSSProperties } from "react";
import { WindowControls } from "@/components/window-controls";
import { cn } from "@/lib/utils";

const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

const IS_WINDOWS =
  typeof navigator !== "undefined" && /Win/i.test(navigator.platform);

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header
      data-tauri-drag-region
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
      className={cn(
        "relative z-10 flex h-10 shrink-0 select-none items-stretch border-b",
        IS_MAC ? "pl-[86px]" : "pl-2",
      )}
    >
      <div className="flex-1" />

      <div
        className="flex shrink-0 items-center gap-0.5 pr-1.5"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
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
