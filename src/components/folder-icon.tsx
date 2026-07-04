import { BADGE_SIZE, CORNER_XY, folderBadges } from "@/lib/folder-icons";
import { cn } from "@/lib/utils";
import { Folder, FolderOpen } from "lucide-react";

type FolderIconProps = {
  name: string;
  open?: boolean;
  className?: string;
};

export function FolderIcon({ name, open, className }: FolderIconProps) {
  const badges = folderBadges(name);
  const Root = open ? FolderOpen : Folder;

  return (
    <Root className={cn("size-3.5 shrink-0", className)}>
      {badges.map((badge, i) => {
        const { x, y } = CORNER_XY[badge.corner];
        const Badge = badge.icon;
        return (
          <Badge
            key={i}
            size={BADGE_SIZE}
            x={x}
            y={y}
            absoluteStrokeWidth
            color={badge.color}
            strokeWidth={2.5}
          />
        );
      })}
    </Root>
  );
}
