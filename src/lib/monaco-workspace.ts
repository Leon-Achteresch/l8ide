import { useEditorSettings } from "@/lib/editor-settings";
import { applyWorkspaceSettings } from "@/lib/workspace-settings";
import { clearEditorConfigCache } from "@/lib/editorconfig";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { typescript as ts } from "monaco-editor";
import { monacoUriForPath } from "@/lib/monaco-uri";
import "@/lib/monaco";

type CompilerOptions = Parameters<
  typeof ts.typescriptDefaults.setCompilerOptions
>[0];

const SOURCE_FILE = /\.(tsx?|jsx?|mts|cts)$/i;
const SYNC_CONCURRENCY = 20;
const MAX_SYNC_FILES = 2000;
const MAX_SYNC_FILE_CHARS = 1_000_000;

let configuredRoot: string | null = null;
let syncGeneration = 0;

function stripJsonComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
}

function languageForPath(path: string): string {
  if (/\.tsx?$/i.test(path)) return "typescript";
  if (/\.(jsx?|mts|cts)$/i.test(path)) return "javascript";
  return "plaintext";
}

function defaultCompilerOptions(rootUri: string): CompilerOptions {
  return {
    target: ts.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    isolatedModules: true,
    strict: true,
    baseUrl: rootUri,
  };
}

async function loadCompilerOptions(
  rootPath: string,
): Promise<CompilerOptions> {
  const rootUri = monacoUriForPath(rootPath).toString();
  try {
    const raw = await readTextFile(`${rootPath}/tsconfig.json`);
    const json = JSON.parse(stripJsonComments(raw)) as {
      compilerOptions?: Record<string, unknown>;
    };
    const opts = json.compilerOptions;
    if (!opts) return defaultCompilerOptions(rootUri);

    const baseUrl = opts.baseUrl
      ? `${rootUri}/${String(opts.baseUrl).replace(/^\.\//, "")}`
      : rootUri;

    const paths = opts.paths as Record<string, string[]> | undefined;

    return {
      ...defaultCompilerOptions(rootUri),
      baseUrl,
      paths: paths
        ? Object.fromEntries(
            Object.entries(paths).map(([key, values]) => [
              key,
              values.map((v) => v.replace(/^\.\//, "")),
            ]),
          )
        : undefined,
    };
  } catch {
    return defaultCompilerOptions(rootUri);
  }
}

const MODULE_RESOLUTION_CODES = [
  2307, 2792, 7016, 2688, 2503, 2602, 7026, 2580, 2582, 2583, 2584, 2591,
];

function applyCompilerOptions(options: CompilerOptions) {
  const semantic = useEditorSettings.getState().semanticValidation;
  for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
    defaults.setCompilerOptions(options);
    defaults.setDiagnosticsOptions({
      noSemanticValidation: !semantic,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: MODULE_RESOLUTION_CODES,
    });
    defaults.setEagerModelSync(true);
  }
}

let watchingSetting = false;

function watchSemanticSetting() {
  if (watchingSetting) return;
  watchingSetting = true;
  let prev = useEditorSettings.getState().semanticValidation;
  useEditorSettings.subscribe((s) => {
    if (s.semanticValidation === prev) return;
    prev = s.semanticValidation;
    for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
      defaults.setDiagnosticsOptions({
        noSemanticValidation: !s.semanticValidation,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: MODULE_RESOLUTION_CODES,
      });
    }
  });
}

export async function configureMonacoWorkspace(rootPath: string) {
  if (configuredRoot !== rootPath) {
    for (const model of monaco.editor.getModels()) {
      model.dispose();
    }
    clearEditorConfigCache();
    configuredRoot = rootPath;
    syncGeneration++;
  }

  await applyWorkspaceSettings(rootPath).catch(() => {});
  const options = await loadCompilerOptions(rootPath);
  applyCompilerOptions(options);
  watchSemanticSetting();
}

export async function syncMonacoWorkspaceModels(files: string[]) {
  const generation = syncGeneration;
  const sources = files
    .filter((f) => SOURCE_FILE.test(f))
    .slice(0, MAX_SYNC_FILES);

  let index = 0;
  async function worker() {
    while (index < sources.length) {
      if (generation !== syncGeneration) return;
      const path = sources[index++]!;
      const uri = monacoUriForPath(path);
      if (monaco.editor.getModel(uri)) continue;
      try {
        const content = await readTextFile(path);
        if (generation !== syncGeneration) return;
        if (content.length > MAX_SYNC_FILE_CHARS) continue;
        if (monaco.editor.getModel(uri)) continue;
        monaco.editor.createModel(content, languageForPath(path), uri);
      } catch {
        continue;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SYNC_CONCURRENCY, sources.length) }, () =>
      worker(),
    ),
  );
}
