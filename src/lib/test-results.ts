import { invoke } from "@tauri-apps/api/core";
import { readTextFile, remove } from "@tauri-apps/plugin-fs";
import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import { findTestCases } from "@/lib/test-lens-core";
import {
  parseBunJUnit,
  parseTestResults,
  summarize,
  type TestResult,
} from "@/lib/test-results-core";
import { sq } from "@/lib/shell-quote";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = { code: number | null; stdout: string; stderr: string };

type Store = {
  byPath: Record<string, TestResult[]>;
  running: Record<string, boolean>;
};

export const useTestResults = create<Store>(() => ({
  byPath: {},
  running: {},
}));

export async function runFileWithResults(path: string): Promise<void> {
  const ws = useWorkspaceStore.getState();
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!root) return;
  const rel = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;

  const { detectTool } = await import("@/lib/test-lens");
  const tool = await detectTool(root);
  if (tool === "npm") {
    toast.info("Kein unterstützter Test-Runner (Bun, Vitest oder Jest) erkannt.");
    return;
  }
  const bunReport = tool === "bun"
    ? `${root}/.l8ide-test-${Date.now()}-${Math.random().toString(36).slice(2)}.xml`
    : null;
  const command =
    tool === "vitest"
      ? `npx vitest run ${sq(rel)} --reporter=json`
      : tool === "jest"
        ? `npx jest ${sq(rel)} --json`
        : `bun test ${sq(rel.startsWith("./") ? rel : `./${rel}`)} --reporter=junit --reporter-outfile=${sq(bunReport!)}`;

  useTestResults.setState((s) => ({ running: { ...s.running, [path]: true } }));
  toast.loading("Tests laufen…", { id: `test-${path}` });
  try {
    const res = await invoke<ShellResult>("run_shell", {
      cwd: root,
      command,
      timeoutMs: 120000,
    });
    const results = bunReport
      ? parseBunJUnit(await readTextFile(bunReport).catch(() => ""))
      : parseTestResults(res.stdout);
    useTestResults.setState((s) => ({ byPath: { ...s.byPath, [path]: results } }));
    if (results.length === 0) {
      toast.error("Keine Testergebnisse erhalten.", { id: `test-${path}` });
      return;
    }
    const { passed, failed, skipped } = summarize(results);
    const msg = `${passed} ✓  ${failed} ✗${skipped ? `  ${skipped} ○` : ""}`;
    if (failed > 0) toast.error(msg, { id: `test-${path}` });
    else toast.success(msg, { id: `test-${path}` });
  } catch {
    toast.error("Testlauf fehlgeschlagen.", { id: `test-${path}` });
  } finally {
    if (bunReport) await remove(bunReport).catch(() => {});
    useTestResults.setState((s) => ({
      running: { ...s.running, [path]: false },
    }));
  }
}

const SYMBOL: Record<string, string> = {
  passed: "  ✓",
  failed: "  ✗",
  skipped: "  ○",
  pending: "  ○",
};
const CLASS: Record<string, string> = {
  passed: "l8-test-pass",
  failed: "l8-test-fail",
  skipped: "l8-test-skip",
  pending: "l8-test-skip",
};

export function attachTestResults(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);

  const render = () => {
    const results = useTestResults.getState().byPath[absPath];
    const model = editor.getModel();
    if (!results || !model) {
      collection.clear();
      return;
    }
    const lineByTitle = new Map<string, number>();
    for (const c of findTestCases(model.getValue())) {
      if (!lineByTitle.has(c.title)) lineByTitle.set(c.title, c.line);
    }
    const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
    for (const r of results) {
      const line = lineByTitle.get(r.title);
      if (!line) continue;
      const col = model.getLineMaxColumn(line);
      decos.push({
        range: new monaco.Range(line, col, line, col),
        options: {
          after: { content: SYMBOL[r.status] ?? "", inlineClassName: CLASS[r.status] },
          showIfCollapsed: true,
          ...(r.message
            ? { hoverMessage: { value: "```\n" + r.message + "\n```" } }
            : {}),
        },
      });
    }
    collection.set(decos);
  };

  const unsub = useTestResults.subscribe(render);
  render();
  editor.onDidDispose(() => {
    unsub();
    collection.clear();
  });
}
