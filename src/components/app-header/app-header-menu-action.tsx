import type { LucideIcon } from "lucide-react";

type AppHeaderMenuActionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

export function AppHeaderMenuAction({
  icon: Icon,
  label,
  onClick,
}: AppHeaderMenuActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-1 rounded-md py-2 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
    >
      <Icon className="size-4" strokeWidth={2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
