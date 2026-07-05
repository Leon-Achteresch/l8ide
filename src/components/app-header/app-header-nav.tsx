import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import { Keyboard, Settings } from "lucide-react";
import { type CSSProperties } from "react";

export function AppHeaderNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
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
  );
}
