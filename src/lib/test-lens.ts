import type * as monacoNs from "monaco-editor";
import {
  buildTestCommand,
  findTestCases,
  isTestFile,
  type TestTool,
} from "@/lib/test-lens-core";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import { useWorkspaceStore } from "@/lib/workspace-store";

const RUN_TEST = "l8.runTest";
const LANGS = [
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
];

const toolCache = new Map<string, TestTool>();

async function detectTool(root: string): Promise<TestTool> {
  const cached = toolCache.get(root);
  if (cached) return cached;
  let tool: TestTool = "npm";
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const pkg = JSON.parse(await readTextFile(`${root}/package.json`)) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) tool = "vitest";
    else if (deps.jest) tool = "jest";
  } catch {
    tool = "npm";
  }
  toolCache.set(root, tool);
  return tool;
}

function relPath(path: string, root: string | null): string {
  const r = root?.replace(/\/+$/, "");
  return r && path.startsWith(`${r}/`) ? path.slice(r.length + 1) : path;
}

let registered = false;

export function registerTestLens(m: typeof monacoNs) {
  if (registered) return;
  registered = true;

  m.editor.registerCommand(RUN_TEST, (_accessor, relFile: string, title?: string) => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    void Promise.all([
      detectTool(root),
      import("@/lib/terminal"),
    ]).then(([tool, term]) =>
      term.runInTerminal(buildTestCommand(tool, relFile, title)),
    );
  });

  m.languages.registerCodeLensProvider(LANGS, {
    provideCodeLenses(model) {
      const path = pathFromMonacoUri(model.uri);
      if (!isTestFile(path)) return { lenses: [], dispose() {} };
      const root = useWorkspaceStore.getState().rootPath ?? null;
      const rel = relPath(path, root);
      const cases = findTestCases(model.getValue());
      if (cases.length === 0) return { lenses: [], dispose() {} };

      const lenses: monacoNs.languages.CodeLens[] = [
        {
          range: new m.Range(1, 1, 1, 1),
          command: {
            id: RUN_TEST,
            title: "▶ Alle Tests der Datei",
            arguments: [rel],
          },
        },
      ];
      for (const c of cases) {
        lenses.push({
          range: new m.Range(c.line, 1, c.line, 1),
          command: {
            id: RUN_TEST,
            title: c.kind === "describe" ? "▶ Suite" : "▶ Test",
            arguments: [rel, c.title],
          },
        });
      }
      return { lenses, dispose() {} };
    },
  });
}
