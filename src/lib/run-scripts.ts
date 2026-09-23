import { exists, readTextFile } from "@tauri-apps/plugin-fs";

export type Script = { name: string; command: string };
export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";
export const PACKAGE_MANAGERS: PackageManager[] = ["bun", "pnpm", "yarn", "npm"];

const LOCKFILES = ["bun.lock", "bun.lockb", "pnpm-lock.yaml", "yarn.lock"];

export function scriptCommand(pm: PackageManager, name: string) {
  if (!/^[\w:.-]+$/.test(name)) {
    throw new Error("Skriptname enthält Zeichen, die im Terminal nicht sicher sind.");
  }
  return `${pm} run ${name}`;
}

export function preferredScript(scripts: Script[], previous?: string | null): string | null {
  if (previous && scripts.some((script) => script.name === previous)) return previous;
  for (const name of ["dev", "start", "serve", "preview"]) {
    if (scripts.some((script) => script.name === name)) return name;
  }
  return scripts[0]?.name ?? null;
}

async function fileExists(path: string) {
  try {
    return await exists(path);
  } catch {
    return false;
  }
}

export async function detectPackageManager(root: string): Promise<PackageManager> {
  const has = new Set<string>();
  await Promise.all(
    LOCKFILES.map(async (f) => {
      if (await fileExists(`${root}/${f}`)) has.add(f);
    }),
  );
  if (has.has("bun.lock") || has.has("bun.lockb")) return "bun";
  if (has.has("pnpm-lock.yaml")) return "pnpm";
  if (has.has("yarn.lock")) return "yarn";
  return "npm";
}

export async function readScripts(root: string): Promise<Script[]> {
  const path = `${root}/package.json`;
  if (!(await fileExists(path))) return [];
  try {
    const json = JSON.parse(await readTextFile(path)) as {
      scripts?: Record<string, string>;
    };
    return Object.entries(json.scripts ?? {}).map(([name, command]) => ({
      name,
      command,
    }));
  } catch {
    return [];
  }
}
