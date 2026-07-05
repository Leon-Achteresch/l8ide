import { saveModel } from "@/lib/editor-actions";
import { resolveEditorConfig } from "@/lib/editorconfig";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath, pathFromMonacoUri } from "@/lib/monaco-uri";
import { organizeImportsModel, useRefactorSettings } from "@/lib/ts-refactor";
import { sortTailwindClasses } from "@/lib/tailwind";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import type * as monaco from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PrettierOptions = {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  jsxSingleQuote: boolean;
  quoteProps: "as-needed" | "consistent" | "preserve";
  trailingComma: "all" | "es5" | "none";
  bracketSpacing: boolean;
  bracketSameLine: boolean;
  arrowParens: "always" | "avoid";
  proseWrap: "preserve" | "always" | "never";
  htmlWhitespaceSensitivity: "css" | "strict" | "ignore";
  singleAttributePerLine: boolean;
  vueIndentScriptAndStyle: boolean;
  embeddedLanguageFormatting: "auto" | "off";
  endOfLine: "lf" | "crlf" | "cr" | "auto";
};

export const DEFAULT_OPTIONS: PrettierOptions = {
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: "as-needed",
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  proseWrap: "preserve",
  htmlWhitespaceSensitivity: "css",
  singleAttributePerLine: false,
  vueIndentScriptAndStyle: false,
  embeddedLanguageFormatting: "auto",
  endOfLine: "lf",
};

export type LanguageFormatter = "prettier" | "none";

type PrettierStore = {
  enabled: boolean;
  formatOnSave: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
  editorConfig: boolean;
  formatterByLanguage: Record<string, LanguageFormatter>;
  options: PrettierOptions;
  setEnabled: (v: boolean) => void;
  setFormatOnSave: (v: boolean) => void;
  setFormatOnPaste: (v: boolean) => void;
  setFormatOnType: (v: boolean) => void;
  setEditorConfig: (v: boolean) => void;
  setLanguageFormatter: (lang: string, v: LanguageFormatter) => void;
  setOption: <K extends keyof PrettierOptions>(
    key: K,
    value: PrettierOptions[K],
  ) => void;
  reset: () => void;
};

export const usePrettierSettings = create<PrettierStore>()(
  persist(
    (set) => ({
      enabled: true,
      formatOnSave: false,
      formatOnPaste: false,
      formatOnType: false,
      editorConfig: true,
      formatterByLanguage: {},
      options: DEFAULT_OPTIONS,
      setEnabled: (enabled) => set({ enabled }),
      setFormatOnSave: (formatOnSave) => set({ formatOnSave }),
      setFormatOnPaste: (formatOnPaste) => set({ formatOnPaste }),
      setFormatOnType: (formatOnType) => set({ formatOnType }),
      setEditorConfig: (editorConfig) => set({ editorConfig }),
      setLanguageFormatter: (lang, v) =>
        set((s) => ({
          formatterByLanguage: { ...s.formatterByLanguage, [lang]: v },
        })),
      setOption: (key, value) =>
        set((s) => ({ options: { ...s.options, [key]: value } })),
      reset: () => set({ options: DEFAULT_OPTIONS }),
    }),
    {
      name: "prettier-settings",
      version: 2,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PrettierStore>;
        return {
          ...current,
          ...p,
          options: { ...DEFAULT_OPTIONS, ...(p.options ?? {}) },
          formatterByLanguage: p.formatterByLanguage ?? {},
        };
      },
    },
  ),
);

type PluginName =
  | "babel"
  | "estree"
  | "typescript"
  | "postcss"
  | "html"
  | "markdown"
  | "yaml"
  | "graphql";

type LangConfig = { parser: string; plugins: PluginName[] };

const LANGS: Record<string, LangConfig> = {
  typescript: { parser: "typescript", plugins: ["estree", "typescript"] },
  javascript: { parser: "babel", plugins: ["babel", "estree"] },
  json: { parser: "json", plugins: ["babel", "estree"] },
  jsonc: { parser: "json", plugins: ["babel", "estree"] },
  css: { parser: "css", plugins: ["postcss"] },
  scss: { parser: "scss", plugins: ["postcss"] },
  less: { parser: "less", plugins: ["postcss"] },
  html: {
    parser: "html",
    plugins: ["html", "babel", "estree", "typescript", "postcss"],
  },
  markdown: {
    parser: "markdown",
    plugins: ["markdown", "babel", "estree", "typescript", "postcss", "yaml", "html"],
  },
  yaml: { parser: "yaml", plugins: ["yaml"] },
  graphql: { parser: "graphql", plugins: ["graphql"] },
};

const PLUGIN_LOADERS: Record<PluginName, () => Promise<unknown>> = {
  babel: () => import("prettier/plugins/babel"),
  estree: () => import("prettier/plugins/estree"),
  typescript: () => import("prettier/plugins/typescript"),
  postcss: () => import("prettier/plugins/postcss"),
  html: () => import("prettier/plugins/html"),
  markdown: () => import("prettier/plugins/markdown"),
  yaml: () => import("prettier/plugins/yaml"),
  graphql: () => import("prettier/plugins/graphql"),
};

const pluginCache = new Map<PluginName, unknown>();
let prettierMod: typeof import("prettier/standalone") | null = null;

async function loadPrettier() {
  if (!prettierMod) prettierMod = await import("prettier/standalone");
  return prettierMod;
}

async function loadPlugin(name: PluginName) {
  const cached = pluginCache.get(name);
  if (cached) return cached;
  const m = (await PLUGIN_LOADERS[name]()) as { default?: unknown };
  const plugin = m.default ?? m;
  pluginCache.set(name, plugin);
  return plugin;
}

export const FORMATTABLE_LANGUAGES = Object.keys(LANGS);

export function isFormattable(languageId: string) {
  const s = usePrettierSettings.getState();
  return (
    languageId in LANGS &&
    s.enabled &&
    (s.formatterByLanguage[languageId] ?? "prettier") !== "none"
  );
}

async function editorConfigOverrides(
  filepath?: string,
): Promise<Partial<PrettierOptions>> {
  if (!filepath || !usePrettierSettings.getState().editorConfig) return {};
  const ec = await resolveEditorConfig(filepath);
  const o: Partial<PrettierOptions> = {};
  if (ec.indentStyle) o.useTabs = ec.indentStyle === "tab";
  const width = ec.indentSize ?? ec.tabWidth;
  if (width) o.tabWidth = width;
  if (ec.endOfLine) o.endOfLine = ec.endOfLine;
  if (ec.maxLineLength) o.printWidth = ec.maxLineLength;
  return o;
}

export async function formatCode(
  code: string,
  languageId: string,
  filepath?: string,
  range?: { start: number; end: number },
) {
  const cfg = LANGS[languageId];
  if (!cfg) return null;
  const prettier = await loadPrettier();
  const plugins = await Promise.all(cfg.plugins.map(loadPlugin));
  const { options } = usePrettierSettings.getState();
  const overrides = await editorConfigOverrides(filepath);
  const out = await prettier.format(code, {
    parser: cfg.parser,
    plugins,
    ...options,
    ...overrides,
    ...(range ? { rangeStart: range.start, rangeEnd: range.end } : {}),
  });
  return range ? out : sortTailwindClasses(out, languageId);
}

function minimalEdit(a: string, b: string) {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  let endA = a.length;
  let endB = b.length;
  while (
    endA > start &&
    endB > start &&
    a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)
  ) {
    endA--;
    endB--;
  }
  return { start, endA, text: b.slice(start, endB) };
}

function rangeFromOffsets(
  model: monaco.editor.ITextModel,
  start: number,
  end: number,
): monaco.IRange {
  const s = model.getPositionAt(start);
  const e = model.getPositionAt(end);
  return {
    startLineNumber: s.lineNumber,
    startColumn: s.column,
    endLineNumber: e.lineNumber,
    endColumn: e.column,
  };
}

export function editsFor(model: monaco.editor.ITextModel, oldText: string, newText: string) {
  if (newText === oldText) return [];
  const { start, endA, text } = minimalEdit(oldText, newText);
  return [{ range: rangeFromOffsets(model, start, endA), text }];
}

function messageOf(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.split("\n")[0];
}

export async function formatModel(model: monaco.editor.ITextModel) {
  const languageId = model.getLanguageId();
  if (!isFormattable(languageId)) return false;
  const src = model.getValue();
  try {
    const out = await formatCode(src, languageId, pathFromMonacoUri(model.uri));
    const edits = out == null ? [] : editsFor(model, src, out);
    if (edits.length) {
      model.pushStackElement();
      model.pushEditOperations([], edits, () => null);
      model.pushStackElement();
    }
    return true;
  } catch (e) {
    toast.error(`Prettier: ${messageOf(e)}`);
    return false;
  }
}

export async function formatAndSave(model: monaco.editor.ITextModel) {
  const { enabled, formatOnSave } = usePrettierSettings.getState();
  const { organizeImportsOnSave } = useRefactorSettings.getState();
  if (organizeImportsOnSave) await organizeImportsModel(model);
  if (enabled && formatOnSave) await formatModel(model);
  saveModel(model);
}

export async function formatAndSaveActive() {
  const m = getMonacoInstance();
  const path = useWorkspaceStore.getState().activeFile;
  if (!m || !path || isPageTab(path)) return;
  const model = m.editor.getModel(monacoUriForPath(path));
  if (model) await formatAndSave(model);
}

export function formatActiveEditor() {
  const editors = getMonacoInstance()?.editor.getEditors() ?? [];
  const editor = editors.find((e) => e.hasTextFocus()) ?? editors[0];
  void editor?.getAction("editor.action.formatDocument")?.run();
}

type FormatterDefaults = {
  modeConfiguration: object;
  setModeConfiguration: (c: object) => void;
};

function disableBuiltinFormatters(m: typeof monaco) {
  const off = { documentFormattingEdits: false, documentRangeFormattingEdits: false };
  const apply = (d?: FormatterDefaults) =>
    d?.setModeConfiguration({ ...d.modeConfiguration, ...off });
  const langs = m.languages as unknown as {
    typescript?: {
      typescriptDefaults?: FormatterDefaults;
      javascriptDefaults?: FormatterDefaults;
    };
    json?: { jsonDefaults?: FormatterDefaults };
    css?: {
      cssDefaults?: FormatterDefaults;
      scssDefaults?: FormatterDefaults;
      lessDefaults?: FormatterDefaults;
    };
    html?: {
      htmlDefaults?: FormatterDefaults;
      handlebarDefaults?: FormatterDefaults;
      razorDefaults?: FormatterDefaults;
    };
  };
  apply(langs.typescript?.typescriptDefaults);
  apply(langs.typescript?.javascriptDefaults);
  apply(langs.json?.jsonDefaults);
  apply(langs.css?.cssDefaults);
  apply(langs.css?.scssDefaults);
  apply(langs.css?.lessDefaults);
  apply(langs.html?.htmlDefaults);
  apply(langs.html?.handlebarDefaults);
  apply(langs.html?.razorDefaults);
}

export function initPrettier(m: typeof monaco) {
  disableBuiltinFormatters(m);
  const langs = Object.keys(LANGS);
  m.languages.registerDocumentFormattingEditProvider(langs, {
    async provideDocumentFormattingEdits(model) {
      if (!isFormattable(model.getLanguageId())) return [];
      const src = model.getValue();
      try {
        const out = await formatCode(
          src,
          model.getLanguageId(),
          pathFromMonacoUri(model.uri),
        );
        return out == null ? [] : editsFor(model, src, out);
      } catch (e) {
        toast.error(`Prettier: ${messageOf(e)}`);
        return [];
      }
    },
  });
  m.languages.registerDocumentRangeFormattingEditProvider(langs, {
    async provideDocumentRangeFormattingEdits(model, range) {
      if (!isFormattable(model.getLanguageId())) return [];
      const src = model.getValue();
      const start = model.getOffsetAt({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
      });
      const end = model.getOffsetAt({
        lineNumber: range.endLineNumber,
        column: range.endColumn,
      });
      try {
        const out = await formatCode(
          src,
          model.getLanguageId(),
          pathFromMonacoUri(model.uri),
          { start, end },
        );
        return out == null ? [] : editsFor(model, src, out);
      } catch (e) {
        toast.error(`Prettier: ${messageOf(e)}`);
        return [];
      }
    },
  });
}
