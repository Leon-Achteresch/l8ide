import {
  type EditorConfigProps,
  matches,
  normalize,
  type Parsed,
  parse,
} from "@/lib/editorconfig-glob";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type * as monaco from "monaco-editor";

export type { EditorConfigProps };

function dirname(p: string): string {
  const i = p.replace(/\/+$/, "").lastIndexOf("/");
  return i <= 0 ? "" : p.slice(0, i);
}

const parseCache = new Map<string, Parsed | null>();
const resolveCache = new Map<string, EditorConfigProps>();

async function readConfig(dir: string): Promise<Parsed | null> {
  const cached = parseCache.get(dir);
  if (cached !== undefined) return cached;
  let parsed: Parsed | null = null;
  try {
    parsed = parse(await readTextFile(`${dir}/.editorconfig`));
  } catch {
    parsed = null;
  }
  parseCache.set(dir, parsed);
  return parsed;
}

export async function resolveEditorConfig(
  path: string,
): Promise<EditorConfigProps> {
  const cached = resolveCache.get(path);
  if (cached) return cached;
  const chain: { dir: string; parsed: Parsed }[] = [];
  let dir = dirname(path);
  while (dir) {
    const parsed = await readConfig(dir);
    if (parsed) {
      chain.push({ dir, parsed });
      if (parsed.root) break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const merged: Record<string, string> = {};
  for (const { dir: cfgDir, parsed } of chain.reverse()) {
    const rel = path.startsWith(`${cfgDir}/`)
      ? path.slice(cfgDir.length + 1)
      : path;
    for (const section of parsed.sections) {
      if (matches(section.glob, rel)) Object.assign(merged, section.props);
    }
  }
  const props = normalize(merged);
  resolveCache.set(path, props);
  return props;
}

export async function applyEditorConfig(model: monaco.editor.ITextModel) {
  const ec = await resolveEditorConfig(pathFromMonacoUri(model.uri));
  if (model.isDisposed()) return;
  const opts: monaco.editor.ITextModelUpdateOptions = {};
  if (ec.indentStyle) opts.insertSpaces = ec.indentStyle === "space";
  const size = ec.indentSize ?? ec.tabWidth;
  if (size) opts.tabSize = size;
  if (Object.keys(opts).length) model.updateOptions(opts);
}

export function clearEditorConfigCache() {
  parseCache.clear();
  resolveCache.clear();
}
