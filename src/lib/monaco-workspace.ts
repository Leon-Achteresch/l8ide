import { useEditorSettings } from "@/lib/editor-settings";
import { applyWorkspaceSettings } from "@/lib/workspace-settings";
import { clearEditorConfigCache } from "@/lib/editorconfig";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { typescript as ts } from "monaco-editor";
import { monacoUriForPath, pathFromMonacoUri } from "@/lib/monaco-uri";
import { parseTsconfigJson } from "@/lib/tsconfig-core";
import { importedPackages, initialTypePackages, MonacoDeclarations } from "@/lib/monaco-declarations";
import { useWorkspaceStore } from "@/lib/workspace-store";
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
let declarations: MonacoDeclarations | null = null;
let typesLoading: Promise<void> | null = null;
let configuration: Promise<void> | null = null;
const watchedModels = new WeakSet<monaco.editor.ITextModel>();
let importWatcherRegistered = false;

function watchModelImports(model: monaco.editor.ITextModel) {
  if (watchedModels.has(model)) return;
  const path = pathFromMonacoUri(model.uri);
  if (!SOURCE_FILE.test(path)) return;
  watchedModels.add(model);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scan = () => {
    const root = configuredRoot;
    if (root && (path === root || path.startsWith(`${root}/`))) {
      void declarations?.add(importedPackages(model.getValue()));
    }
  };
  scan();
  const changed = model.onDidChangeContent(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 700);
  });
  model.onWillDispose(() => {
    clearTimeout(timer);
    changed.dispose();
  });
}

function watchWorkspaceImports() {
  if (importWatcherRegistered) return;
  importWatcherRegistered = true;
  monaco.editor.onDidCreateModel(watchModelImports);
  for (const model of monaco.editor.getModels()) watchModelImports(model);
}

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

type TsConfig = { compilerOptions?: Record<string, unknown>; extends?: string | string[]; references?: Array<{ path?: string }> };

function resolveRelative(base: string, relative: string): string {
  const parts = [...base.replace(/\\/g, "/").split("/")];
  for (const part of relative.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

async function readConfig(path: string, root: string, depth = 0): Promise<TsConfig> {
  if (depth > 5) return {};
  const json = parseTsconfigJson(await readTextFile(path)) as TsConfig;
  let inherited: TsConfig = {};
  for (const entry of typeof json.extends === "string" ? [json.extends] : json.extends ?? []) {
    const base = entry.startsWith(".") || entry.startsWith("/")
      ? path.slice(0, path.lastIndexOf("/"))
      : `${root}/node_modules`;
    const parent = entry.startsWith("/") ? entry : resolveRelative(base, entry);
    const candidates = /\.json$/i.test(parent) ? [parent] : [`${parent}.json`, `${parent}/tsconfig.json`];
    for (const candidate of candidates) {
      try {
        const config = await readConfig(candidate, root, depth + 1);
        inherited = { ...inherited, ...config, compilerOptions: { ...inherited.compilerOptions, ...config.compilerOptions } };
        break;
      } catch { /* try the next package layout */ }
    }
  }
  return {
    ...inherited,
    ...json,
    compilerOptions: { ...(inherited.compilerOptions ?? {}), ...(json.compilerOptions ?? {}) },
  };
}

function enumOption<T extends object>(values: T, value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase().replace(/[-_]/g, "");
  return Object.entries(values).find(([key, item]) =>
    typeof item === "number" && key.toLowerCase().replace(/[-_]/g, "") === normalized)?.[1] as number | undefined;
}

async function loadCompilerOptions(rootPath: string): Promise<CompilerOptions> {
  const rootUri = monacoUriForPath(rootPath).toString();
  try {
    let config = await readConfig(`${rootPath}/tsconfig.json`, rootPath);
    const refs = config.references?.filter((ref) => typeof ref.path === "string") ?? [];
    const app = refs.find((ref) => /app|web|client/i.test(ref.path ?? "")) ?? refs[0];
    if (app?.path) {
      const path = resolveRelative(rootPath, app.path);
      try {
        const referenced = await readConfig(/\.json$/i.test(path) ? path : `${path}/tsconfig.json`, rootPath);
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
    for (const key of ["strict", "allowJs", "checkJs", "noEmit", "esModuleInterop", "isolatedModules", "skipLibCheck", "allowSyntheticDefaultImports", "resolveJsonModule", "noImplicitAny", "strictNullChecks", "allowImportingTsExtensions", "noUncheckedIndexedAccess", "exactOptionalPropertyTypes", "verbatimModuleSyntax", "allowArbitraryExtensions", "useDefineForClassFields", "forceConsistentCasingInFileNames"]) {
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

function applyCompilerOptions(options: CompilerOptions) {
  const semantic = useEditorSettings.getState().semanticValidation;
  for (const defaults of [ts.typescriptDefaults, ts.javascriptDefaults]) {
    defaults.setCompilerOptions(options);
    defaults.setDiagnosticsOptions({
      noSemanticValidation: !semantic,
      noSyntaxValidation: false,
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
      });
    }
  });
}

export function configureMonacoWorkspace(rootPath: string): Promise<void> {
  if (configuredRoot === rootPath && configuration) return configuration;
  if (configuredRoot !== rootPath) {
    declarations?.dispose();
    declarations = new MonacoDeclarations(rootPath);
    typesLoading = null;
    for (const model of monaco.editor.getModels()) {
      model.dispose();
    }
    clearEditorConfigCache();
    configuredRoot = rootPath;
    syncGeneration++;
  }

  const generation = syncGeneration;
  configuration = (async () => {
    await applyWorkspaceSettings(rootPath).catch(() => {});
    const options = await loadCompilerOptions(rootPath);
    if (generation !== syncGeneration) return;
    applyCompilerOptions(options);
    watchSemanticSetting();
    watchWorkspaceImports();
    typesLoading ??= initialTypePackages(rootPath, options.types).then((packages) =>
      generation === syncGeneration ? declarations?.add(packages) : undefined,
    );
    await typesLoading;
  })();
  return configuration;
}

export async function syncMonacoWorkspaceModels(files: string[], rootPath: string) {
  if (useWorkspaceStore.getState().rootPath !== rootPath) return;
  await configureMonacoWorkspace(rootPath);
  const generation = syncGeneration;
  if (configuredRoot !== rootPath || useWorkspaceStore.getState().rootPath !== rootPath) return;
  const sources = files
    .filter((f) => SOURCE_FILE.test(f))
    .slice(0, MAX_SYNC_FILES);
  const imported = new Set<string>();

  let index = 0;
  async function worker() {
    while (index < sources.length) {
      if (generation !== syncGeneration) return;
      const path = sources[index++]!;
      const uri = monacoUriForPath(path);
      const existing = monaco.editor.getModel(uri);
      if (existing) {
        for (const name of importedPackages(existing.getValue())) imported.add(name);
        continue;
      }
      try {
        const content = await readTextFile(path);
        if (generation !== syncGeneration) return;
        if (content.length > MAX_SYNC_FILE_CHARS) continue;
        for (const name of importedPackages(content)) imported.add(name);
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
  if (generation === syncGeneration && imported.size > 0) {
    await declarations?.add(imported);
  }
}
