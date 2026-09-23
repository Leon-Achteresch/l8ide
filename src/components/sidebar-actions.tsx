import { useBrowserStore } from "@/lib/browser-store";
import { useMarkersStore, useProblemsPanel } from "@/lib/markers-store";
import { useTerminalStore } from "@/lib/terminal-store";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { CircleAlert, Globe, Terminal } from "lucide-react";

export function SidebarActions() {
  const terminalOpen = useTerminalStore((s) => s.open);
  const toggleTerminal = useTerminalStore((s) => s.toggle);
  const browserOpen = useBrowserStore((s) => s.open);
  const toggleBrowser = useBrowserStore((s) => s.toggle);
  const problemsOpen = useProblemsPanel((s) => s.open);
  const toggleProblems = useProblemsPanel((s) => s.toggle);
  const problemCount = useMarkersStore(
    (s) => s.total.errors + s.total.warnings,
  );

  return (
    <div className="flex shrink-0 justify-center px-3 pb-3 pt-1">
      <div
        role="toolbar"
        aria-label="Panel-Aktionen"
        className="inline-flex items-center gap-0.5 rounded-2xl bg-foreground/[0.04] p-1 ring-1 ring-foreground/[0.06] backdrop-blur-sm"
      >
        <DockButton
          icon={CircleAlert}
          label="Probleme"
          active={problemsOpen}
          onClick={toggleProblems}
          badge={problemCount || undefined}
        />
        <DockButton
          icon={Terminal}
          label="Terminal"
          active={terminalOpen}
          onClick={toggleTerminal}
        />
        <DockButton
          icon={Globe}
          label="Browser"
          active={browserOpen}
          onClick={toggleBrowser}
        />
      </div>
    </div>
  );
}

function DockButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: typeof Terminal;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150",
        active ? "text-foreground" : "hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-dock-indicator"
          transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.55 }}
          className="absolute inset-0 rounded-xl bg-background shadow-sm ring-1 ring-foreground/8"
          aria-hidden
        />
      )}
      <Icon className="relative z-10 size-4" strokeWidth={active ? 2.25 : 2} />
      {badge != null && (
        <span className="absolute -right-0.5 -top-0.5 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </motion.button>
  );
}
