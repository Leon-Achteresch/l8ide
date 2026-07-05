import type { SidebarMode } from "@/lib/workspace-store";
import { FolderTree, Search, type LucideIcon } from "lucide-react";

export const SIDEBAR_TAB_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.55,
} as const;

export const MENU_SPRING = {
  type: "spring",
  stiffness: 460,
  damping: 32,
  mass: 0.55,
} as const;

export const MENU_CONTAINER = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 520,
      damping: 34,
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
} as const;

export const MENU_ITEM = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: MENU_SPRING,
  },
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
