import type * as monaco from "monaco-editor";
import { readTextFile, exists } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { useFileIndexStore } from "@/lib/file-index";
import {
  type DesignSystem,
  conflicts,
  parseRootVars,
  prefixContext,
  resolveColorString,
  scanClassStrings,
  sortValue,
  tokenAt,
  tokenize,
} from "@/lib/tailwind-parse";

type Loaded = { ds: DesignSystem; project: boolean; vars: Map<string, string> };

type TailwindStore = {
  enabled: boolean;
  sortClasses: boolean;
  lint: boolean;
  setEnabled: (v: boolean) => void;
  setSortClasses: (v: boolean) => void;
  setLint: (v: boolean) => void;
};

export const useTailwindSettings = create<TailwindStore>()(
  persist(
    (set) => ({
      enabled: true,
      sortClasses: true,
      lint: true,
      setEnabled: (enabled) => set({ enabled }),
      setSortClasses: (sortClasses) => set({ sortClasses }),
      setLint: (lint) => set({ lint }),
    }),
    { name: "tailwind-settings" },
  ),
);

const TW_LANGS = [
  "html",
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "css",
  "scss",
  "less",
];
const TW_LANG_SET = new Set(TW_LANGS);
const CSS_LANGS = new Set(["css", "scss", "less"]);

const CLASS_CANDIDATES = [
  "src/App.css",
  "src/app.css",
  "src/index.css",
  "src/main.css",
  "src/styles/globals.css",
  "src/styles/index.css",
  "src/styles/tailwind.css",
  "app/globals.css",
  "styles/globals.css",
  "index.css",
  "app.css",
  "globals.css",
];

const TW_ENTRY_RE = /@import\s+["']tailwindcss|@tailwind\s/;

function dirname(p: string) {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "/" : p.slice(0, i);
}

function joinPath(base: string, rel: string) {
  const parts = (base + "/" + rel).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}

async function loadBundled(id: string): Promise<string> {
  const key = id.replace(/\.css$/, "");
  switch (key) {
    case "tailwindcss":
    case "tailwindcss/index":
      return (await import("tailwindcss/index.css?raw")).default;
    case "tailwindcss/theme":
      return (await import("tailwindcss/theme.css?raw")).default;
    case "tailwindcss/preflight":
      return (await import("tailwindcss/preflight.css?raw")).default;
    case "tailwindcss/utilities":
      return (await import("tailwindcss/utilities.css?raw")).default;
    default:
      return "";
  }
}

async function findEntry(): Promise<{ css: string; dir: string } | null> {
  const root = useWorkspaceStore.getState().rootPath;
  if (!root) return null;
  const seen = new Set<string>();
  const files: string[] = [];
  for (const rel of CLASS_CANDIDATES) files.push(joinPath(root, rel));
  for (const f of useFileIndexStore.getState().files) {
    if (f.endsWith(".css") && files.length < 40) files.push(f);
  }
  for (const path of files) {
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      const css = await readTextFile(path);
      if (TW_ENTRY_RE.test(css)) return { css, dir: dirname(path) };
    } catch {
      // not present
    }
  }
  return null;
}

function makeResolvers(root: string) {
  const loadStylesheet = async (id: string, base: string) => {
    if (id === "tailwindcss" || id.startsWith("tailwindcss/")) {
      return { path: id, base, content: await loadBundled(id) };
    }
    if (id.startsWith(".")) {
      const path = joinPath(base, id);
      try {
        return { path, base: dirname(path), content: await readTextFile(path) };
      } catch {
        return { path, base, content: "" };
      }
    }
    const path = joinPath(root + "/node_modules", id);
    try {
      return { path, base: dirname(path), content: await readTextFile(path) };
    } catch {
      return { path: id, base, content: "" };
    }
  };
  const loadModule = async (id: string) => {
    throw new Error(`tailwind: @plugin/@config not supported (${id})`);
  };
  return { loadStylesheet, loadModule };
}

let loadPromise: Promise<Loaded | null> | null = null;

async function load(): Promise<Loaded | null> {
  try {
    const tw = (await import("tailwindcss")) as unknown as {
      __unstable__loadDesignSystem: (
        css: string,
        opts: object,
      ) => Promise<DesignSystem>;
    };
    const root = useWorkspaceStore.getState().rootPath ?? "/";
    const resolvers = makeResolvers(root);
    const entry = await findEntry();
    if (entry) {
      const ds = await tw.__unstable__loadDesignSystem(entry.css, {
        base: entry.dir,
        ...resolvers,
      });
      return { ds, project: true, vars: parseRootVars(entry.css) };
    }
    if (!(await exists(root + "/node_modules/tailwindcss").catch(() => false)))
      return null;
    const ds = await tw.__unstable__loadDesignSystem(
      await loadBundled("tailwindcss"),
      { base: root, ...resolvers },
    );
    return { ds, project: false, vars: new Map() };
  } catch (e) {
    console.warn("tailwind: design system unavailable", e);
    return null;
  }
}

function ensureLoaded(): Promise<Loaded | null> {
  if (!useTailwindSettings.getState().enabled) return Promise.resolve(null);
  if (!loadPromise) loadPromise = load();
  return loadPromise;
}

let classListCache: string[] | null = null;
function classList(ds: DesignSystem): string[] {
  if (!classListCache) classListCache = ds.getClassList().map(([c]) => c);
  return classListCache;
}

let probe: HTMLSpanElement | null = null;
const colorCache = new Map<string, monaco.languages.IColor | null>();

function toColor(str: string): monaco.languages.IColor | null {
  const cached = colorCache.get(str);
  if (cached !== undefined) return cached;
  if (!probe) {
    probe = document.createElement("span");
    probe.style.cssText = "position:absolute;left:-9999px;top:-9999px";
    document.body.appendChild(probe);
  }
  probe.style.color = "";
  probe.style.color = str;
  let res: monaco.languages.IColor | null = null;
  if (probe.style.color) {
    const c = getComputedStyle(probe).color;
    let m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,/]/).map((s) => parseFloat(s.trim()));
      res = { red: p[0] / 255, green: p[1] / 255, blue: p[2] / 255, alpha: p[3] ?? 1 };
    } else if ((m = c.match(/color\([^ ]+ ([^)]+)\)/))) {
      const p = m[1].split(/[ /]+/).map((s) => parseFloat(s));
      res = { red: p[0], green: p[1], blue: p[2], alpha: p[3] ?? 1 };
    }
  }
  if (res && (isNaN(res.red) || isNaN(res.green) || isNaN(res.blue))) res = null;
  colorCache.set(str, res);
  return res;
}

function toHex(c: monaco.languages.IColor): string {
  const h = (n: number) =>
    Math.round(Math.max(0, Math.min(1, n)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(c.red)}${h(c.green)}${h(c.blue)}`;
}

export async function sortTailwindClasses(
  text: string,
  languageId: string,
): Promise<string> {
  const s = useTailwindSettings.getState();
  if (!s.enabled || !s.sortClasses || !TW_LANG_SET.has(languageId)) return text;
  const loaded = await ensureLoaded();
  if (!loaded) return text;
  const regions = scanClassStrings(text).sort((a, b) => b.start - a.start);
  let out = text;
  for (const r of regions) {
    const sorted = sortValue(r.value, loaded.ds);
    if (sorted !== r.value) out = out.slice(0, r.start) + sorted + out.slice(r.end);
  }
  return out;
}

function registerCompletion(m: typeof monaco) {
  m.languages.registerCompletionItemProvider(TW_LANGS, {
    triggerCharacters: ['"', "'", "`", " ", ":", "-", "/", "."],
    async provideCompletionItems(model, position) {
      const loaded = await ensureLoaded();
      if (!loaded) return { suggestions: [] };
      const line = model.getLineContent(position.lineNumber);
      const prefix = line.slice(0, position.column - 1);
      if (!prefixContext(prefix)) return { suggestions: [] };
      const { start, end } = tokenAt(line, position.column - 1);
      const typed = line.slice(start, position.column - 1).toLowerCase();
      const list = classList(loaded.ds);
      const starts: string[] = [];
      const contains: string[] = [];
      for (const c of list) {
        if (starts.length + contains.length >= 400) break;
        const lc = c.toLowerCase();
        if (lc.startsWith(typed)) starts.push(c);
        else if (typed && lc.includes(typed)) contains.push(c);
      }
      const picked = [...starts, ...contains].slice(0, 250);
      const css = loaded.ds.candidatesToCss(picked);
      const range = new m.Range(
        position.lineNumber,
        start + 1,
        position.lineNumber,
        end + 1,
      );
      const Kind = m.languages.CompletionItemKind;
      const suggestions = picked.map((label, i) => {
        const rule = css[i];
        const str = rule ? resolveColorString(rule, loaded.ds, loaded.vars) : null;
        const color = str ? toColor(str) : null;
        return {
          label,
          kind: color ? Kind.Color : Kind.Constant,
          insertText: label,
          range,
          sortText: label,
          detail: color ? toHex(color) : undefined,
          documentation: rule
            ? { value: "```css\n" + rule.trim() + "\n```" }
            : undefined,
        } satisfies monaco.languages.CompletionItem;
      });
      return { suggestions };
    },
  });
}

function registerHover(m: typeof monaco) {
  m.languages.registerHoverProvider(TW_LANGS, {
    async provideHover(model, position) {
      const loaded = await ensureLoaded();
      if (!loaded) return null;
      const offset = model.getOffsetAt(position);
      const region = scanClassStrings(model.getValue()).find(
        (r) => offset >= r.start && offset <= r.end,
      );
      if (!region) return null;
      const rel = offset - region.start;
      const tok = tokenize(region.value).find(
        (t) => rel >= t.offset && rel <= t.offset + t.token.length,
      );
      if (!tok) return null;
      const rule = loaded.ds.candidatesToCss([tok.token])[0];
      if (!rule) return null;
      const startPos = model.getPositionAt(region.start + tok.offset);
      const endPos = model.getPositionAt(
        region.start + tok.offset + tok.token.length,
      );
      return {
        range: new m.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column,
        ),
        contents: [{ value: "```css\n" + rule.trim() + "\n```" }],
      };
    },
  });
}

function registerColors(m: typeof monaco) {
  m.languages.registerColorProvider(TW_LANGS, {
    async provideDocumentColors(model) {
      const loaded = await ensureLoaded();
      if (!loaded) return [];
      const text = model.getValue();
      const out: monaco.languages.IColorInformation[] = [];
      for (const region of scanClassStrings(text)) {
        const toks = tokenize(region.value);
        if (!toks.length) continue;
        const css = loaded.ds.candidatesToCss(toks.map((t) => t.token));
        toks.forEach((t, i) => {
          const rule = css[i];
          if (!rule) return;
          const str = resolveColorString(rule, loaded.ds, loaded.vars);
          if (!str) return;
          const color = toColor(str);
          if (!color) return;
          const s = model.getPositionAt(region.start + t.offset);
          const e = model.getPositionAt(
            region.start + t.offset + t.token.length,
          );
          out.push({
            color,
            range: new m.Range(s.lineNumber, s.column, e.lineNumber, e.column),
          });
        });
      }
      return out;
    },
    provideColorPresentations(model, info) {
      return [{ label: model.getValueInRange(info.range) }];
    },
  });
}

function lintModel(m: typeof monaco, model: monaco.editor.ITextModel) {
  const s = useTailwindSettings.getState();
  if (!s.enabled || !s.lint) {
    m.editor.setModelMarkers(model, "tailwind", []);
    return;
  }
  void ensureLoaded().then((loaded) => {
    if (model.isDisposed()) return;
    if (!loaded) {
      m.editor.setModelMarkers(model, "tailwind", []);
      return;
    }
    const { ds } = loaded;
    const text = model.getValue();
    const isCss = CSS_LANGS.has(model.getLanguageId());
    const markers: monaco.editor.IMarkerData[] = [];
    const mark = (
      start: number,
      len: number,
      message: string,
    ) => {
      const s0 = model.getPositionAt(start);
      const e0 = model.getPositionAt(start + len);
      markers.push({
        startLineNumber: s0.lineNumber,
        startColumn: s0.column,
        endLineNumber: e0.lineNumber,
        endColumn: e0.column,
        severity: m.MarkerSeverity.Warning,
        message,
        source: "tailwind",
      });
    };
    for (const region of scanClassStrings(text)) {
      for (const c of conflicts(region.value, ds)) {
        mark(
          region.start + c.offset,
          c.token.length,
          `'${c.token}' is overridden by '${c.overriddenBy}'`,
        );
      }
      if (loaded.project && isCss) {
        const toks = tokenize(region.value);
        const css = ds.candidatesToCss(toks.map((t) => t.token));
        toks.forEach((t, i) => {
          if (css[i] == null)
            mark(
              region.start + t.offset,
              t.token.length,
              `Unknown Tailwind utility: ${t.token}`,
            );
        });
      }
    }
    m.editor.setModelMarkers(model, "tailwind", markers);
  });
}

const lintTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleLint(m: typeof monaco, model: monaco.editor.ITextModel) {
  if (!TW_LANG_SET.has(model.getLanguageId())) return;
  const key = model.uri.toString();
  clearTimeout(lintTimers.get(key));
  lintTimers.set(
    key,
    setTimeout(() => lintModel(m, model), 400),
  );
}

function registerLint(m: typeof monaco) {
  const watch = (model: monaco.editor.ITextModel) => {
    scheduleLint(m, model);
    model.onDidChangeContent(() => scheduleLint(m, model));
  };
  m.editor.onDidCreateModel(watch);
  for (const model of m.editor.getModels()) watch(model);
  useTailwindSettings.subscribe(() => {
    for (const model of m.editor.getModels()) scheduleLint(m, model);
  });
}

let registered = false;

export function registerTailwind(m: typeof monaco) {
  if (registered) return;
  registered = true;
  registerCompletion(m);
  registerHover(m);
  registerColors(m);
  registerLint(m);
}

