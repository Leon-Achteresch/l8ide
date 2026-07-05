import { WindowControls } from "@/components/window-controls";
import { cn } from "@/lib/utils";
import { type CSSProperties } from "react";
import { AppHeaderBranch } from "./app-header-branch";
import { AppHeaderFolderButton } from "./app-header-folder-button";
import { AppHeaderLogoMenu } from "./app-header-logo-menu";
import { AppHeaderNav } from "./app-header-nav";
import { AppHeaderRun } from "./app-header-run";
import { AppHeaderSidebarTabs } from "./app-header-sidebar-tabs";
import { AppHeaderSidebarToggle } from "./app-header-sidebar-toggle";
import { AppHeaderTitle } from "./app-header-title";
import { IS_MAC, IS_WINDOWS } from "./constants";

export function AppHeader() {
  return (
    <header
      data-tauri-drag-region
      style={{ WebkitAppRegion: "drag" } as CSSProperties}
      className={cn(
        "relative z-10 flex h-10 shrink-0 select-none items-stretch border-b",
        IS_MAC ? "pl-[86px]" : "pl-2",
      )}
    >
      <div
        className="flex items-center gap-1.5 px-1"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <AppHeaderLogoMenu />

        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden />

        <AppHeaderSidebarToggle />

        <AppHeaderSidebarTabs />

        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden />

        <AppHeaderFolderButton />

        <AppHeaderBranch />
      </div>

      <AppHeaderTitle />

      <div className="flex items-center">
        <AppHeaderRun />
      </div>

      <AppHeaderNav />

      {IS_WINDOWS && <WindowControls />}
    </header>
  );
}
