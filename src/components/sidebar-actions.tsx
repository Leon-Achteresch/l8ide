import { Button } from "@/components/ui/button";
import { useTerminalStore } from "@/lib/terminal-store";
import { cn } from "@/lib/utils";
import { Terminal } from "lucide-react";

export function SidebarActions() {
  const open = useTerminalStore((s) => s.open);
  const toggle = useTerminalStore((s) => s.toggle);

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
            open && "bg-accent text-foreground shadow-xs",
          )}
          onClick={toggle}
          aria-pressed={open}
          title="Terminal"
        >
          <Terminal />
        </Button>
      </div>
    </div>
  );
}
