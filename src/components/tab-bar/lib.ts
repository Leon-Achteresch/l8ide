import {
  isPageTab,
  pageRoute,
  PAGES,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import type { LucideIcon } from "lucide-react";
import { Settings } from "lucide-react";

export const tabClass =
  "relative isolate flex h-full shrink-0 cursor-pointer items-center gap-1.5 px-3 text-sm";

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
};
