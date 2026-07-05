import { cn } from "@/lib/utils";
import { type SidebarMode, useWorkspaceStore } from "@/lib/workspace-store";
import { motion } from "motion/react";
import { SIDEBAR_TAB_SPRING, SIDEBAR_TABS } from "./constants";

export function AppHeaderSidebarTabs() {
  const sidebarOpen = useWorkspaceStore((s) => s.sidebarOpen);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);
  const sidebarMode = useWorkspaceStore((s) => s.sidebarMode);
  const setSidebarMode = useWorkspaceStore((s) => s.setSidebarMode);

  function selectSidebarTab(mode: SidebarMode) {
    if (sidebarMode === mode && sidebarOpen) {
      toggleSidebar();
      return;
    }
    setSidebarMode(mode);
    if (!sidebarOpen) toggleSidebar();
  }

  return (
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
  );
}
