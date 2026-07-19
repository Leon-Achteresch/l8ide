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

async function backupFile(path: string): Promise<string> {
  const base = (await appDataDir()).replace(/\/+$/, "");
  return `${base}/hotexit/${hashPath(path)}.txt`;
}

export function scheduleBackup(path: string, getContent: () => string) {
  clearTimeout(timers.get(path));
  timers.set(
    path,
    setTimeout(() => {
      timers.delete(path);
      void (async () => {
        try {
          const content = getContent();
          if (content.length > MAX_SIZE) return;
          const file = await backupFile(path);
          await mkdir(file.slice(0, file.lastIndexOf("/")), {
            recursive: true,
          });
          await writeTextFile(file, content);
        } catch {
          return;
        }
      })();
    }, DEBOUNCE_MS),
  );
}

export async function clearBackup(path: string) {
  clearTimeout(timers.get(path));
  timers.delete(path);
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
