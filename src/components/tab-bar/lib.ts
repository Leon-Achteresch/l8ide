import {
  isPageTab,
  pageRoute,
  PAGES,
  useWorkspaceStore,
} from "@/lib/workspace-store";

export const tabClass =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-r px-3 text-sm";

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
