import { Kbd } from "@/components/ui/kbd";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import type { LucideIcon } from "lucide-react";

type AppHeaderMenuActionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  shortcut?: string;
};

export function AppHeaderMenuAction({
  icon: Icon,
  label,
  onClick,
  shortcut,
}: AppHeaderMenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground"
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={2} />
      <span className="min-w-0 flex-1 text-xs font-medium">{label}</span>
      {shortcut ? (
        <Kbd className="h-4 px-1 text-[10px]">{formatForDisplay(shortcut)}</Kbd>
      ) : null}
    </button>
  );
}
