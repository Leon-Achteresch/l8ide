import { Button } from "@/components/ui/button";
import { useBrowserStore } from "@/lib/browser-store";
import { useTerminalStore } from "@/lib/terminal-store";
import { cn } from "@/lib/utils";
import { Globe, Terminal } from "lucide-react";

export function SidebarActions() {
  const terminalOpen = useTerminalStore((s) => s.open);
  const toggleTerminal = useTerminalStore((s) => s.toggle);
  const browserOpen = useBrowserStore((s) => s.open);
  const toggleBrowser = useBrowserStore((s) => s.toggle);

  return (
    <div className="flex shrink-0 border-t bg-muted/20 px-2 py-1.5">
      <div
        role="toolbar"
        aria-label="Sidebar-Aktionen"
        className="flex items-center gap-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            terminalOpen && "bg-accent text-foreground shadow-xs",
          )}
          onClick={toggleTerminal}
          aria-pressed={terminalOpen}
          title="Terminal"
        >
          <Terminal />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-muted-foreground hover:text-foreground",
            browserOpen && "bg-accent text-foreground shadow-xs",
          )}
          onClick={toggleBrowser}
          aria-pressed={browserOpen}
          title="Browser"
        >
          <Globe />
        </Button>
      </div>
    </div>
  );
}
