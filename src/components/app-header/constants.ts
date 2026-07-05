import type { SidebarMode } from "@/lib/workspace-store";
import { FolderTree, Search, type LucideIcon } from "lucide-react";

export const SIDEBAR_TAB_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.55,
} as const;

export const SIDEBAR_TABS: { mode: SidebarMode; label: string; icon: LucideIcon }[] = [
  { mode: "FileTree", label: "Explorer", icon: FolderTree },
  { mode: "Search", label: "Search", icon: Search },
];

export const AUTOSAVE_DELAYS = [500, 1000, 2000];

export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

export const IS_WINDOWS =
  typeof navigator !== "undefined" && /Win/i.test(navigator.platform);
