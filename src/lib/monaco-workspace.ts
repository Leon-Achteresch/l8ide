import { useEditorSettings } from "@/lib/editor-settings";
import { applyWorkspaceSettings } from "@/lib/workspace-settings";
import { clearEditorConfigCache } from "@/lib/editorconfig";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { typescript as ts } from "monaco-editor";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { parseTsconfigJson } from "@/lib/tsconfig-core";
import "@/lib/monaco";

type CompilerOptions = Parameters<
  typeof ts.typescriptDefaults.setCompilerOptions
>[0];

const SOURCE_FILE = /\.(tsx?|jsx?|mjs|cjs|mts|cts)$/i;
const SYNC_CONCURRENCY = 20;
const MAX_SYNC_FILES = 2000;
const MAX_SYNC_FILE_CHARS = 1_000_000;

let configuredRoot: string | null = null;
let syncGeneration = 0;
let typeLibs: monaco.IDisposable[] = [];
let typesLoading: Promise<void> | null = null;

function languageForPath(path: string): string {
  if (/\.(tsx?|mts|cts)$/i.test(path)) return "typescript";
  if (/\.(jsx?|mjs|cjs)$/i.test(path)) return "javascript";
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

type TsConfig = { compilerOptions?: Record<string, unknown>; extends?: string; references?: Array<{ path?: string }> };

function resolveRelative(base: string, relative: string): string {
  const parts = [...base.replace(/\\/g, "/").split("/")];
  for (const part of relative.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

async function readConfig(path: string, depth = 0): Promise<TsConfig> {
  if (depth > 5) return {};
  const json = parseTsconfigJson(await readTextFile(path)) as TsConfig;
  let inherited: TsConfig = {};
  if (json.extends?.startsWith(".")) {
    const parent = resolveRelative(path.slice(0, path.lastIndexOf("/")), json.extends);
    try {
      inherited = await readConfig(/\.json$/i.test(parent) ? parent : `${parent}.json`, depth + 1);
    } catch { /* optional base config */ }
  }
  return {
    ...inherited,
    ...json,
    compilerOptions: { ...(inherited.compilerOptions ?? {}), ...(json.compilerOptions ?? {}) },
  };
}

function enumOption<T extends object>(values: T, value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  return (values as Record<string, number>)[value.toUpperCase()];
}

async function loadCompilerOptions(rootPath: string): Promise<CompilerOptions> {
  const rootUri = monacoUriForPath(rootPath).toString();
  try {
    let config = await readConfig(`${rootPath}/tsconfig.json`);
    const refs = config.references?.filter((ref) => typeof ref.path === "string") ?? [];
    const app = refs.find((ref) => /app|web|client/i.test(ref.path ?? "")) ?? refs[0];
    if (app?.path) {
      const path = resolveRelative(rootPath, app.path);
      try {
        const referenced = await readConfig(/\.json$/i.test(path) ? path : `${path}/tsconfig.json`);
        config = { ...config, compilerOptions: { ...config.compilerOptions, ...referenced.compilerOptions } };
      } catch { /* use root config */ }
    }
    const raw = config.compilerOptions ?? {};
    const baseUrl = typeof raw.baseUrl === "string"
      ? `${rootUri}/${raw.baseUrl.replace(/^\.\//, "")}`
      : rootUri;
    const paths = raw.paths && typeof raw.paths === "object"
      ? Object.fromEntries(Object.entries(raw.paths).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((value) => typeof value === "string")))
      : undefined;
    const options: Record<string, unknown> = { ...defaultCompilerOptions(rootUri), baseUrl, paths };
    for (const key of ["strict", "allowJs", "checkJs", "noEmit", "esModuleInterop", "isolatedModules", "skipLibCheck", "allowSyntheticDefaultImports", "resolveJsonModule", "noImplicitAny", "strictNullChecks", "allowImportingTsExtensions"]) {
      if (typeof raw[key] === "boolean") options[key] = raw[key];
    }
    for (const [key, values] of [["target", ts.ScriptTarget], ["module", ts.ModuleKind], ["moduleResolution", ts.ModuleResolutionKind], ["jsx", ts.JsxEmit]] as const) {
      const value = enumOption(values, raw[key]);
      if (value !== undefined) options[key] = value;
    }
    if (typeof raw.jsxImportSource === "string") options.jsxImportSource = raw.jsxImportSource;
    if (Array.isArray(raw.types)) options.types = raw.types.filter((value): value is string => typeof value === "string");
    return options as CompilerOptions;
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

async function syncReactDeclarations(rootPath: string, generation: number) {
  const packages = ["@types/react", "@types/react-dom", "@types/prop-types", "@types/scheduler", "csstype"];
  const files: string[] = [];
  async function visit(directory: string, depth: number) {
    if (files.length >= 350 || depth > 5) return;
    const entries = await readDir(directory).catch(() => []);
    for (const entry of entries) {
      if (files.length >= 350) break;
      if (entry.name === "node_modules" || entry.name === "ts5.0") continue;
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory) await visit(path, depth + 1);
      else if (entry.isFile && /\.d\.(ts|mts|cts)$/i.test(entry.name)) files.push(path);
    }
  }
  await Promise.all(packages.map((name) => visit(`${rootPath}/node_modules/${name}`, 0)));
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, async () => {
    while (index < files.length && generation === syncGeneration) {
      const path = files[index++]!;
      try {
        const content = await readTextFile(path);
        if (content.length > MAX_SYNC_FILE_CHARS || generation !== syncGeneration) continue;
        const uri = monacoUriForPath(path).toString();
        typeLibs.push(ts.typescriptDefaults.addExtraLib(content, uri));
        typeLibs.push(ts.javascriptDefaults.addExtraLib(content, uri));
      } catch { /* optional declaration */ }
    }
  }));
}

export async function configureMonacoWorkspace(rootPath: string) {
  if (configuredRoot !== rootPath) {
    for (const lib of typeLibs) lib.dispose();
    typeLibs = [];
    typesLoading = null;
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
  typesLoading ??= syncReactDeclarations(rootPath, syncGeneration);
  await typesLoading;
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
