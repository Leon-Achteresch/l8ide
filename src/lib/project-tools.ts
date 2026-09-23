import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import type * as monaco from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isPathTrusted } from "@/lib/workspace-trust";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { marker, parseBiomeFindings, parseEslintFindings, type LintEdit, type LintFinding } from "@/lib/project-diagnostics-core";

export type ProjectTool = "biome" | "eslint" | "prettier";
type ToolResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };
type StoredFindings = { version: number; findings: LintFinding[] };
const findingsByModel = new WeakMap<monaco.editor.ITextModel, Partial<Record<"eslint" | "biome", StoredFindings>>>();
const attachedModels = new WeakMap<monaco.editor.ITextModel, { users: number; dispose: () => void }>();

function setFindings(model: monaco.editor.ITextModel, tool: "eslint" | "biome", findings: LintFinding[]) {
  const current = findingsByModel.get(model) ?? {};
  current[tool] = { version: model.getVersionId(), findings };
  findingsByModel.set(model, current);
}

function intersects(a: monaco.IRange, b: monaco.IRange) {
  return a.startLineNumber <= b.endLineNumber && a.endLineNumber >= b.startLineNumber;
}

function workspaceEdit(model: monaco.editor.ITextModel, edits: LintEdit[]): monaco.languages.WorkspaceEdit {
  return { edits: edits.map((fix) => ({
    resource: model.uri,
    versionId: model.getVersionId(),
    textEdit: { range: fix.range, text: fix.text },
  })) };
}

let codeActionsRegistered = false;

export function registerProjectCodeActions(monacoApi: typeof monaco) {
  if (codeActionsRegistered) return;
  codeActionsRegistered = true;
  monacoApi.languages.registerCodeActionProvider(["typescript", "javascript", "json", "jsonc"], {
    provideCodeActions(model, range, context) {
      const stored = findingsByModel.get(model);
      if (!stored) return { actions: [], dispose() {} };
      const actions: monaco.languages.CodeAction[] = [];
      for (const tool of ["eslint", "biome"] as const) {
        const result = stored[tool];
        if (!result || result.version !== model.getVersionId()) continue;
        if (!context.only || context.only.startsWith("quickfix")) {
          for (const finding of result.findings) {
            if (!intersects(range, finding.diagnostic)) continue;
            for (const fix of finding.fixes) {
              actions.push({
                title: fix.title,
                kind: "quickfix",
                diagnostics: [finding.diagnostic],
                isPreferred: fix.preferred,
                edit: workspaceEdit(model, [fix]),
              });
            }
          }
        }
      }
      if (!context.only || "source.fixAll.eslint".startsWith(context.only)) {
        const eslint = stored.eslint;
        if (eslint?.version === model.getVersionId()) {
          const preferred = eslint.findings.flatMap((finding) => finding.fixes.filter((fix) => fix.preferred));
          preferred.sort((a, b) => model.getOffsetAt({ lineNumber: a.range.startLineNumber, column: a.range.startColumn }) - model.getOffsetAt({ lineNumber: b.range.startLineNumber, column: b.range.startColumn }));
          const nonOverlapping: LintEdit[] = [];
          let lastEnd = -1;
          for (const fix of preferred) {
            const start = model.getOffsetAt({ lineNumber: fix.range.startLineNumber, column: fix.range.startColumn });
            const end = model.getOffsetAt({ lineNumber: fix.range.endLineNumber, column: fix.range.endColumn });
            if (start < lastEnd || (start === lastEnd && start === end)) continue;
            nonOverlapping.push(fix);
            lastEnd = end;
          }
          if (nonOverlapping.length > 0) {
            actions.push({
              title: "ESLint: alle automatisch korrigierbaren Probleme beheben",
              kind: "source.fixAll.eslint",
              edit: workspaceEdit(model, nonOverlapping),
            });
          }
        }
      }
      return { actions, dispose() {} };
    },
  }, { providedCodeActionKinds: ["quickfix", "source.fixAll.eslint"] });
}

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
  const existing = attachedModels.get(model);
  if (existing) {
    existing.users++;
    editor.onDidDispose(() => {
      if (--existing.users === 0) existing.dispose();
    });
    return;
  }
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
      const available = enabled && await hasProjectTool(root, tool);
      if (disposed || current !== generation || model.isDisposed()) return;
      if (!available) {
        setFindings(model, tool, []);
        monacoApi.editor.setModelMarkers(model, tool, []);
        return;
      }
      try {
        const result = await runProjectTool(tool, "lint", path, source);
        if (disposed || current !== generation || model.isDisposed()) return;
        const output = result.stdout.trim();
        const findings = output
          ? tool === "biome" ? parseBiomeFindings(output) : parseEslintFindings(output, source)
          : result.code === 0 ? [] : [{ diagnostic: marker(result.stderr.trim() || `${tool} fehlgeschlagen`, 4, 1, 1), fixes: [] }];
        setFindings(model, tool, findings);
        const markers = findings.map((finding) => finding.diagnostic);
        monacoApi.editor.setModelMarkers(model, tool, markers);
      } catch (error) {
        if (disposed || current !== generation || model.isDisposed()) return;
        const diagnostic = marker(String(error), 4, 1, 1);
        setFindings(model, tool, [{ diagnostic, fixes: [] }]);
        monacoApi.editor.setModelMarkers(model, tool, [diagnostic]);
      }
    }));
  };

  const schedule = () => {
    generation++;
    setFindings(model, "biome", []);
    monacoApi.editor.setModelMarkers(model, "biome", []);
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(false), 600);
  };
  void refresh(true);
  const change = model.onDidChangeContent(schedule);
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
  const dispose = () => {
    disposed = true;
    generation++;
    clearTimeout(timer);
    change.dispose();
    settings();
    window.removeEventListener("l8ide:file-saved", saved);
    findingsByModel.delete(model);
    monacoApi.editor.setModelMarkers(model, "biome", []);
    monacoApi.editor.setModelMarkers(model, "eslint", []);
    attachedModels.delete(model);
  };
  const attached = { users: 1, dispose };
  attachedModels.set(model, attached);
  editor.onDidDispose(() => {
    if (--attached.users === 0) dispose();
  });
}
