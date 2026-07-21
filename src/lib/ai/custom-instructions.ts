import { exists, readTextFile } from "@tauri-apps/plugin-fs";

const CANDIDATES = [
  ".l8ide/instructions.md",
  ".github/copilot-instructions.md",
  "AGENTS.md",
  "CLAUDE.md",
];

const MAX_CHARS = 6000;

let cached = "";
let cachedSource: string | null = null;

export function getCustomInstructions(): string {
  return cached;
}

export function customInstructionsSource(): string | null {
  return cachedSource;
}

export async function loadCustomInstructions(root: string): Promise<void> {
  const base = root.replace(/\/+$/, "");
  cached = "";
  cachedSource = null;
  for (const rel of CANDIDATES) {
    const path = `${base}/${rel}`;
    if (!(await exists(path).catch(() => false))) continue;
    const text = (await readTextFile(path).catch(() => "")).trim();
    if (!text) continue;
    cached = text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n…` : text;
    cachedSource = rel;
    return;
  }
}
