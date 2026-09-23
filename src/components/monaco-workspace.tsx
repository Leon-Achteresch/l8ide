import { useFileIndexStore } from "@/lib/file-index";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useEffect } from "react";

const SYNC_DELAY = 500;

export function MonacoWorkspace() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const hiddenNames = useWorkspaceStore((s) => s.hiddenNames);
  const workspaceHidden = useWorkspaceStore((s) => s.workspaceHidden);
  const files = useFileIndexStore((s) => s.files);
  const ensureIndex = useFileIndexStore((s) => s.ensureIndex);

  useEffect(() => {
    if (!rootPath) return;
    ensureIndex(rootPath, hiddenNames, workspaceHidden[rootPath] ?? []);
  }, [rootPath, hiddenNames, workspaceHidden, ensureIndex]);

  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    void import("@/lib/monaco-workspace").then((ws) => {
      if (!cancelled) void ws.configureMonacoWorkspace(rootPath);
    });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  useEffect(() => {
    if (!rootPath || files.length === 0) return;
    const timer = setTimeout(() => {
      void import("@/lib/monaco-workspace").then((ws) =>
        ws.syncMonacoWorkspaceModels(files, rootPath),
      );
    }, SYNC_DELAY);
    return () => clearTimeout(timer);
  }, [rootPath, files]);

  return null;
}
