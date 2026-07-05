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
    };
    const rel = json.logo ?? json.icon;
    if (!rel) return null;
    const full = joinRoot(root, rel);
    return (await fileExists(full)) ? full : null;
  } catch {
    return null;
  }
}

async function fromTauriConfig(root: string) {
  const configPath = joinRoot(root, "src-tauri/tauri.conf.json");
  if (!(await fileExists(configPath))) return null;
  try {
    const json = JSON.parse(await readTextFile(configPath)) as {
      bundle?: { icon?: string[] };
    };
    for (const rel of json.bundle?.icon ?? []) {
      const withExt = IMAGE_EXT.test(rel)
        ? joinRoot(root, `src-tauri/${rel}`)
        : null;
      if (withExt && (await fileExists(withExt))) return withExt;
      const resolved = await resolveCandidate(joinRoot(root, "src-tauri"), rel);
      if (resolved) return resolved;
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
    return (await fileExists(full)) ? full : null;
  } catch {
    return null;
  }
}

export async function findProjectLogo(rootPath: string) {
  const fromConfig = await fromL8ideConfig(rootPath);
  if (fromConfig) return fromConfig;

  for (const base of CANDIDATES) {
    const found = await resolveCandidate(rootPath, base);
    if (found) return found;
  }

  const fromTauri = await fromTauriConfig(rootPath);
  if (fromTauri) return fromTauri;

  return fromPackageJson(rootPath);
}
