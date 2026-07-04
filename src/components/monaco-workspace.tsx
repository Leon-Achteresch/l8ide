import { useFileIndexStore } from "@/lib/file-index";
import {
  configureMonacoWorkspace,
  syncMonacoWorkspaceModels,
} from "@/lib/monaco-workspace";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useEffect } from "react";

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
    void configureMonacoWorkspace(rootPath);
  }, [rootPath]);

  useEffect(() => {
    if (!rootPath || files.length === 0) return;
    void syncMonacoWorkspaceModels(files);
  }, [rootPath, files]);

  return null;
}
