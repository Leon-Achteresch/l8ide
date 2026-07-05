import { exists, readTextFile } from "@tauri-apps/plugin-fs";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
const EXTENSIONS = ["png", "svg", "ico", "jpg", "jpeg", "webp", "avif", "gif", "bmp"];

const CANDIDATES = [
  ".l8ide/logo",
  ".l8ide/icon",
  "logo",
  "icon",
  "app-icon",
  "app_icon",
  "favicon",
  "public/logo",
  "public/icon",
  "public/favicon",
  "assets/logo",
  "assets/icon",
  "resources/logo",
  "resources/icon",
  "src-tauri/icons/32x32",
  "src-tauri/icons/64x64",
  "src-tauri/icons/128x128",
  "src-tauri/icons/icon",
  "icons/32x32",
  "icons/64x64",
  "icons/128x128",
  "icons/icon",
  "build/icon",
];

export type ProjectLogoPaths = {
  dark?: string;
  light?: string;
  path?: string;
};

async function fileExists(path: string) {
  try {
    return await exists(path);
  } catch {
    return false;
  }
}

function joinRoot(root: string, rel: string) {
  return rel.startsWith("/") ? rel : `${root}/${rel.replace(/^\.\//, "")}`;
}

async function resolveCandidate(root: string, base: string) {
  if (IMAGE_EXT.test(base)) {
    const full = joinRoot(root, base);
    return (await fileExists(full)) ? full : null;
  }
  for (const ext of EXTENSIONS) {
    const full = joinRoot(root, `${base}.${ext}`);
    if (await fileExists(full)) return full;
  }
  return null;
}

async function fromL8ideConfig(root: string) {
  const configPath = joinRoot(root, ".l8ide/project.json");
  if (!(await fileExists(configPath))) return null;
  try {
    const json = JSON.parse(await readTextFile(configPath)) as {
      logo?: string;
      icon?: string;
      logoDark?: string;
      logoLight?: string;
    };
    const dark = json.logoDark
      ? joinRoot(root, json.logoDark)
      : json.logo
        ? joinRoot(root, json.logo)
        : json.icon
          ? joinRoot(root, json.icon)
          : null;
    const light = json.logoLight ? joinRoot(root, json.logoLight) : null;
    if (light && (await fileExists(light))) {
      return {
        dark: dark && (await fileExists(dark)) ? dark : light,
        light,
      } satisfies ProjectLogoPaths;
    }
    if (dark && (await fileExists(dark))) {
      return { path: dark } satisfies ProjectLogoPaths;
    }
  } catch {
    return null;
  }
  return null;
}

async function fromThemeLogos(root: string) {
  const dark = await resolveCandidate(root, "public/logo_black");
  const light = await resolveCandidate(root, "public/logo_white");
  if (dark && light) return { dark, light } satisfies ProjectLogoPaths;
  if (dark) return { path: dark } satisfies ProjectLogoPaths;
  if (light) return { path: light } satisfies ProjectLogoPaths;
  return null;
}

async function fromTauriConfig(root: string) {
  const configPath = joinRoot(root, "src-tauri/tauri.conf.json");
  if (!(await fileExists(configPath))) return null;
  try {
    const json = JSON.parse(await readTextFile(configPath)) as {
      bundle?: { icon?: string[] };
    };
    for (const rel of json.bundle?.icon ?? []) {
      if (!IMAGE_EXT.test(rel)) continue;
      const full = joinRoot(root, `src-tauri/${rel}`);
      if (await fileExists(full)) return { path: full } satisfies ProjectLogoPaths;
    }
    for (const rel of json.bundle?.icon ?? []) {
      const resolved = await resolveCandidate(joinRoot(root, "src-tauri"), rel);
      if (resolved) return { path: resolved } satisfies ProjectLogoPaths;
    }
  } catch {
    return null;
  }
  return null;
}

async function fromPackageJson(root: string) {
  const configPath = joinRoot(root, "package.json");
  if (!(await fileExists(configPath))) return null;
  try {
    const json = JSON.parse(await readTextFile(configPath)) as { icon?: string };
    if (!json.icon) return null;
    const full = joinRoot(root, json.icon);
    return (await fileExists(full))
      ? ({ path: full } satisfies ProjectLogoPaths)
      : null;
  } catch {
    return null;
  }
}

async function fromCandidateList(root: string) {
  for (const base of CANDIDATES) {
    const found = await resolveCandidate(root, base);
    if (found) return { path: found } satisfies ProjectLogoPaths;
  }
  return null;
}

export async function findProjectLogo(rootPath: string) {
  const fromConfig = await fromL8ideConfig(rootPath);
  if (fromConfig) return fromConfig;

  const themed = await fromThemeLogos(rootPath);
  if (themed) return themed;

  const fromTauri = await fromTauriConfig(rootPath);
  if (fromTauri) return fromTauri;

  const listed = await fromCandidateList(rootPath);
  if (listed) return listed;

  return fromPackageJson(rootPath);
}

export function pickProjectLogo(
  logos: ProjectLogoPaths,
  theme: string | undefined,
) {
  if (logos.dark && logos.light) {
    return theme === "dark" ? logos.dark : logos.light;
  }
  return logos.path ?? logos.dark ?? logos.light ?? null;
}
