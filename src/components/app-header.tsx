import { SvgPathMorphing } from "@/blocks/svg-path-morphing";
import { useFileSearchStore } from "@/components/file-search";
import { WindowControls } from "@/components/window-controls";
import { cn } from "@/lib/utils";
import {
  type SidebarMode,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { Link, useRouterState } from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderOpen,
  FolderTree,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { type CSSProperties } from "react";

const SIDEBAR_TAB_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.55,
} as const;

const SIDEBAR_TABS: { mode: SidebarMode; label: string; icon: LucideIcon }[] = [
  { mode: "FileTree", label: "Explorer", icon: FolderTree },
  { mode: "Search", label: "Search", icon: Search },
];

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
  const sidebarMode = useWorkspaceStore((s) => s.sidebarMode);
  const setSidebarMode = useWorkspaceStore((s) => s.setSidebarMode);
  const openFileSearch = useFileSearchStore((s) => s.setOpen);

  const { resolvedTheme } = useTheme();

  const folderName = rootPath ? rootPath.split("/").pop() : null;

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRootPath(selected);
  }

  function selectSidebarTab(mode: SidebarMode) {
    if (sidebarMode === mode && sidebarOpen) {
      toggleSidebar();
      return;
    }
    setSidebarMode(mode);
    if (!sidebarOpen) toggleSidebar();
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
      <div
        className="flex items-center gap-1.5 px-1"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <img
          src={resolvedTheme === "dark" ? "/logo_black.png" : "/logo_white.png"}
          alt="Logo"
          className="h-5 w-auto shrink-0 opacity-90"
        />

        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden />

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

        <div
          role="tablist"
          aria-label="Sidebar"
          className="relative inline-flex h-7 shrink-0 items-center rounded-lg bg-foreground/[0.05] p-0.5 ring-1 ring-foreground/[0.04]"
        >
          {SIDEBAR_TABS.map(({ mode, label, icon: Icon }) => {
            const active = sidebarMode === mode;
            return (
              <motion.button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                title={label}
                onClick={() => selectSidebarTab(mode)}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className={cn(
                  "relative z-10 inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-tab-indicator"
                    transition={SIDEBAR_TAB_SPRING}
                    animate={{ opacity: sidebarOpen ? 1 : 0.65 }}
                    className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-foreground/8"
                    aria-hidden
                  />
                )}
                <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                <span>{label}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden />

        <button
          type="button"
          aria-label="Open folder"
          title="Open folder"
          onClick={pickFolder}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground"
        >
          <FolderOpen className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {folderName ? (
          <button
            type="button"
            onClick={() => openFileSearch(true)}
            title="Datei suchen"
            style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
            className="max-w-full truncate rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            {folderName}
          </button>
        ) : (
          <span className="truncate text-sm font-medium text-muted-foreground">
            No folder open
          </span>
        )}
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
