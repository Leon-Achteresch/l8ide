import {
  isPageTab,
  pageRoute,
  PAGES,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import type { LucideIcon } from "lucide-react";
import { Keyboard, Settings } from "lucide-react";

export const TAB_SPRING = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.55,
} as const;

export const tabClass =
  "relative isolate flex h-7 max-w-[200px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-150";

export function store() {
  return useWorkspaceStore.getState();
}

export function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

export function tabName(path: string) {
  if (isPageTab(path)) {
    const route = pageRoute(path);
    return PAGES[route] ?? route;
  }
  return baseName(path);
}

export function parentDir(path: string) {
  return path.split("/").slice(0, -1).pop();
}

export const pageIcons: Record<string, LucideIcon> = {
  "/settings": Settings,
  "/shortcuts": Keyboard,
};
