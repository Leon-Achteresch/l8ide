import { appDataDir } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { hashPath } from "@/lib/local-history";

const MAX_SIZE = 1_000_000;
const DEBOUNCE_MS = 1000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, () => string>();

async function backupFile(path: string): Promise<string> {
  const base = (await appDataDir()).replace(/\/+$/, "");
  return `${base}/hotexit/${hashPath(path)}.txt`;
}

async function writeBackup(path: string, getContent: () => string) {
  try {
    const content = getContent();
    if (content.length > MAX_SIZE) return;
    const file = await backupFile(path);
    await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
    await writeTextFile(file, content);
  } catch {
    return;
  }
}

export function scheduleBackup(path: string, getContent: () => string) {
  clearTimeout(timers.get(path));
  pending.set(path, getContent);
  timers.set(
    path,
    setTimeout(() => {
      timers.delete(path);
      pending.delete(path);
      void writeBackup(path, getContent);
    }, DEBOUNCE_MS),
  );
}

export async function flushBackups(): Promise<void> {
  const entries = [...pending.entries()];
  pending.clear();
  for (const [path] of entries) {
    clearTimeout(timers.get(path));
    timers.delete(path);
  }
  await Promise.all(entries.map(([path, get]) => writeBackup(path, get)));
}

export async function clearBackup(path: string) {
  clearTimeout(timers.get(path));
  timers.delete(path);
  pending.delete(path);
  try {
    const file = await backupFile(path);
    if (await exists(file)) await remove(file);
  } catch {
    return;
  }
}

export async function takeBackup(
  path: string,
  diskContent: string,
): Promise<string | null> {
  try {
    const file = await backupFile(path);
    if (!(await exists(file))) return null;
    const backup = await readTextFile(file);
    if (backup === diskContent) {
      await remove(file);
      return null;
    }
    return backup;
  } catch {
    return null;
  }
}
