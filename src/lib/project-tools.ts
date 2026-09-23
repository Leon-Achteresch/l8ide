import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import type * as monaco from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPathTrusted } from "@/lib/workspace-trust";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { marker, parseBiomeDiagnostics, parseEslintDiagnostics } from "@/lib/project-diagnostics-core";

export type ProjectTool = "biome" | "eslint" | "prettier";
type ToolResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };

export const useProjectToolSettings = create<{
  biomeLint: boolean;
  eslintLint: boolean;
  setBiomeLint: (value: boolean) => void;
  setEslintLint: (value: boolean) => void;
}>()(
  persist((set) => ({
    biomeLint: true,
    eslintLint: true,
    setBiomeLint: (biomeLint) => set({ biomeLint }),
    setEslintLint: (eslintLint) => set({ eslintLint }),
  }), { name: "project-tool-settings" }),
);

const availability = new Map<string, { checked: number; result: Promise<boolean> }>();

export function hasProjectTool(root: string, tool: ProjectTool): Promise<boolean> {
  const key = `${root}:${tool}`;
  let cached = availability.get(key);
  if (!cached || Date.now() - cached.checked > 5000) {
    const result = Promise.all([
      exists(`${root}/node_modules/.bin/${tool}`).catch(() => false),
      exists(`${root}/node_modules/.bin/${tool}.cmd`).catch(() => false),
    ]).then(([unix, windows]) => unix || windows);
    cached = { checked: Date.now(), result };
    availability.set(key, cached);
  }
  return cached.result;
}

export async function runProjectTool(tool: ProjectTool, mode: "format" | "lint", path: string, content: string): Promise<ToolResult> {
  const { rootPath, trustedFolders } = useWorkspaceStore.getState();
  if (!rootPath || !isPathTrusted(trustedFolders, rootPath)) {
    throw new Error("Projektordner ist nicht vertrauenswürdig");
  }
  if (!await hasProjectTool(rootPath, tool)) {
    throw new Error(`${tool} ist nicht im Projekt installiert`);
  }
  const result = await invoke<ToolResult>("project_tool", { root: rootPath, path, content, tool, mode });
  if (result.timedOut) throw new Error(`${tool} hat zu lange gebraucht`);
  return result;
}

export async function formatWithProjectTool(tool: "biome" | "prettier", path: string, content: string): Promise<string> {
  const result = await runProjectTool(tool, "format", path, content);
  if (result.code !== 0) throw new Error(result.stderr.trim() || `${tool} fehlgeschlagen`);
  return result.stdout;
}

export function attachProjectDiagnostics(editor: monaco.editor.ICodeEditor, monacoApi: typeof monaco, path: string) {
  const model = editor.getModel();
  if (!model || !/\.(tsx?|jsx?|mjs|cjs|mts|cts|jsonc?)$/i.test(path)) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;
  let disposed = false;

  const refresh = async (includeBiome: boolean) => {
    const current = ++generation;
    const source = model.getValue();
    const root = useWorkspaceStore.getState().rootPath;
    if (!root) return;
    const settings = useProjectToolSettings.getState();
    await Promise.all((["biome", "eslint"] as const).filter((tool) => includeBiome || tool === "eslint").map(async (tool) => {
      const enabled = tool === "biome" ? settings.biomeLint : settings.eslintLint;
      if (!enabled || !await hasProjectTool(root, tool)) {
        monacoApi.editor.setModelMarkers(model, tool, []);
        return;
      }
      try {
        const result = await runProjectTool(tool, "lint", path, source);
        if (disposed || current !== generation || model.isDisposed()) return;
        const output = result.stdout.trim();
        const markers = output
          ? tool === "biome" ? parseBiomeDiagnostics(output) : parseEslintDiagnostics(output)
          : result.code === 0 ? [] : [marker(result.stderr.trim() || `${tool} fehlgeschlagen`, 4, 1, 1)];
        monacoApi.editor.setModelMarkers(model, tool, markers);
      } catch (error) {
        if (disposed || current !== generation || model.isDisposed()) return;
        monacoApi.editor.setModelMarkers(model, tool, [marker(String(error), 4, 1, 1)]);
      }
    }));
  };

  const schedule = () => {
    generation++;
    monacoApi.editor.setModelMarkers(model, "biome", []);
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(false), 600);
  };
  void refresh(true);
  const change = editor.onDidChangeModelContent(schedule);
  const settings = useProjectToolSettings.subscribe(() => {
    clearTimeout(timer);
    void refresh(true);
  });
  const saved = (event: Event) => {
    if ((event as CustomEvent<string>).detail === path) {
      clearTimeout(timer);
      void refresh(true);
    }
  };
  window.addEventListener("l8ide:file-saved", saved);
  editor.onDidDispose(() => {
    disposed = true;
    generation++;
    clearTimeout(timer);
    change.dispose();
    settings();
    window.removeEventListener("l8ide:file-saved", saved);
    monacoApi.editor.setModelMarkers(model, "biome", []);
    monacoApi.editor.setModelMarkers(model, "eslint", []);
  });
}
