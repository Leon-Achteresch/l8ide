import { appDataDir } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { useFileCompare } from "@/lib/file-compare";
import { languageOf } from "@/lib/language-of";

const MAX_SNAPSHOTS = 20;
const MAX_SIZE = 1_000_000;

function hashPath(path: string): string {
  let h = 5381;
  for (let i = 0; i < path.length; i++) {
    h = ((h << 5) + h + path.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

async function historyDir(filePath: string): Promise<string> {
  const base = (await appDataDir()).replace(/\/+$/, "");
  return `${base}/history/${hashPath(filePath)}`;
}

export type Snapshot = { time: number; file: string };

export async function snapshotBeforeSave(filePath: string): Promise<void> {
  try {
    if (!(await exists(filePath))) return;
    const content = await readTextFile(filePath);
    if (content.length > MAX_SIZE) return;
    const dir = await historyDir(filePath);
    await mkdir(dir, { recursive: true });
    const names = (await readDir(dir))
      .map((e) => e.name ?? "")
      .filter((n) => n.endsWith(".snap"))
      .sort();
    const latest = names[names.length - 1];
    if (latest && (await readTextFile(`${dir}/${latest}`)) === content) return;
    await writeTextFile(`${dir}/${Date.now()}.snap`, content);
    const excess = names.length + 1 - MAX_SNAPSHOTS;
    for (const old of names.slice(0, Math.max(0, excess))) {
      await remove(`${dir}/${old}`);
    }
  } catch {
    return;
  }
}

export async function listSnapshots(filePath: string): Promise<Snapshot[]> {
  try {
    const dir = await historyDir(filePath);
    if (!(await exists(dir))) return [];
    return (await readDir(dir))
      .map((e) => e.name ?? "")
      .filter((n) => n.endsWith(".snap"))
      .map((n) => ({ time: parseInt(n, 10), file: `${dir}/${n}` }))
      .filter((s) => Number.isFinite(s.time))
      .sort((a, b) => b.time - a.time);
  } catch {
    return [];
  }
}

export async function openSnapshotDiff(filePath: string, snap: Snapshot) {
  const [old, current] = await Promise.all([
    readTextFile(snap.file),
    readTextFile(filePath).catch(() => ""),
  ]);
  const name = filePath.split("/").pop() ?? filePath;
  const label = new Date(snap.time).toLocaleString("de-DE");
  useFileCompare
    .getState()
    .openCompare(
      { label: `${name} (${label})`, text: old },
      { label: "Aktuell", text: current },
      languageOf(filePath),
    );
}

export async function restoreContent(filePath: string, content: string) {
  await snapshotBeforeSave(filePath);
  await writeTextFile(filePath, content);
  const model = getMonacoInstance()?.editor.getModel(monacoUriForPath(filePath));
  if (model && !model.isDisposed() && model.getValue() !== content) {
    model.setValue(content);
  }
}

export async function restoreSnapshot(filePath: string, snap: Snapshot) {
  await restoreContent(filePath, await readTextFile(snap.file));
}

type LocalHistoryDialogStore = {
  path: string | null;
  openFor: (path: string) => void;
  close: () => void;
};

export const useLocalHistoryDialog = create<LocalHistoryDialogStore>()(
  (set) => ({
    path: null,
    openFor: (path) => set({ path }),
    close: () => set({ path: null }),
  }),
);
