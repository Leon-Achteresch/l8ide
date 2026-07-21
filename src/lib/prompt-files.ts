import { exists, readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

export type UserPrompt = {
  name: string;
  description: string;
  body: string;
  attachActiveFile: boolean;
};

const PROMPT_DIRS = [".l8ide/prompts", ".github/prompts"];

export function parsePromptFile(text: string): {
  description: string;
  body: string;
  attachActiveFile: boolean;
} {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (fm) {
    const meta: Record<string, string> = {};
    for (const line of fm[1].split(/\r?\n/)) {
      const kv = /^([\w-]+):\s*(.*)$/.exec(line.trim());
      if (kv) meta[kv[1].toLowerCase()] = kv[2].trim();
    }
    const attach = /^(true|active|yes)$/i.test(
      meta.attach ?? meta.attachactivefile ?? "",
    );
    return {
      description: meta.description ?? "",
      body: fm[2].trim(),
      attachActiveFile: attach,
    };
  }
  const body = text.trim();
  const firstLine = body.split(/\r?\n/, 1)[0]?.replace(/^#+\s*/, "").trim();
  return { description: firstLine ?? "", body, attachActiveFile: false };
}

export function renderPrompt(body: string, rest: string): string {
  const re = /\$\{input\}|\{\{\s*input\s*\}\}|\$ARGUMENTS|\$INPUT/gi;
  if (re.test(body)) return body.replace(re, rest);
  return rest ? `${body}\n\n${rest}` : body;
}

export const usePromptFiles = create<{ prompts: UserPrompt[] }>(() => ({
  prompts: [],
}));

export async function loadPromptFiles(root: string): Promise<void> {
  const base = root.replace(/\/+$/, "");
  const found: UserPrompt[] = [];
  const seen = new Set<string>();
  for (const dir of PROMPT_DIRS) {
    const path = `${base}/${dir}`;
    if (!(await exists(path).catch(() => false))) continue;
    const entries = await readDir(path).catch(() => []);
    for (const e of entries) {
      if (e.isDirectory || !e.name?.endsWith(".md")) continue;
      const name = e.name.replace(/\.prompt\.md$|\.md$/, "").toLowerCase();
      if (!/^[a-z][\w-]*$/.test(name) || seen.has(name)) continue;
      const text = await readTextFile(`${path}/${e.name}`).catch(() => "");
      const parsed = parsePromptFile(text);
      if (!parsed.body) continue;
      seen.add(name);
      found.push({
        name,
        description: parsed.description || "Projekt-Prompt",
        body: parsed.body,
        attachActiveFile: parsed.attachActiveFile,
      });
    }
  }
  usePromptFiles.setState({ prompts: found });
}
