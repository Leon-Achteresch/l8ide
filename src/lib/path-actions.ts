import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function relativePath(path: string): string {
  const root = useWorkspaceStore.getState().rootPath;
  return root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

export function baseName(path: string): string {
  return path.replace(/\/+$/, "").split("/").pop() || path;
}

export function copyText(text: string, label = "Kopiert") {
  void navigator.clipboard.writeText(text).then(
    () => toast.success(label),
    () => toast.error("Zwischenablage nicht verfügbar"),
  );
}

export function copyPath(path: string) {
  copyText(path, "Pfad kopiert");
}

export function copyRelativePath(path: string) {
  copyText(relativePath(path), "Relativer Pfad kopiert");
}

export function revealInOs(path: string) {
  void revealItemInDir(path).catch(() => toast.error("Konnte nicht im Finder zeigen"));
}

export function openWithDefaultApp(path: string) {
  void openPath(path).catch(() => toast.error("Konnte nicht geöffnet werden"));
}
