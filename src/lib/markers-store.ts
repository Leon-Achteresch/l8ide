import { pathFromMonacoUri } from "@/lib/monaco-uri";
import { isPageTab } from "@/lib/workspace-store";
import type * as monaco from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProblemsPanel = {
  open: boolean;
  height: number;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setHeight: (height: number) => void;
};

export const useProblemsPanel = create<ProblemsPanel>()(
  persist(
    (set) => ({
      open: false,
      height: 240,
      toggle: () => set((s) => ({ open: !s.open })),
      setOpen: (open) => set({ open }),
      setHeight: (height) => set({ height: Math.max(120, Math.min(600, height)) }),
    }),
    { name: "problems-panel" },
  ),
);

export type Counts = { errors: number; warnings: number; infos: number };

type MarkersStore = {
  byPath: Record<string, monaco.editor.IMarker[]>;
  fileCounts: Record<string, Counts>;
  dirCounts: Record<string, Counts>;
  total: Counts;
};

const EMPTY: Counts = { errors: 0, warnings: 0, infos: 0 };

export const useMarkersStore = create<MarkersStore>(() => ({
  byPath: {},
  fileCounts: {},
  dirCounts: {},
  total: { ...EMPTY },
}));

function bump(c: Counts, severity: number) {
  if (severity === 8) c.errors++;
  else if (severity === 4) c.warnings++;
  else c.infos++;
}

function ancestors(path: string): string[] {
  const out: string[] = [];
  let i = path.lastIndexOf("/");
  while (i > 0) {
    out.push(path.slice(0, i));
    i = path.lastIndexOf("/", i - 1);
  }
  return out;
}

function rebuild(m: typeof monaco) {
  const all = m.editor.getModelMarkers({});
  const byPath: Record<string, monaco.editor.IMarker[]> = {};
  const fileCounts: Record<string, Counts> = {};
  const dirCounts: Record<string, Counts> = {};
  const total: Counts = { ...EMPTY };

  for (const marker of all) {
    if (marker.severity < 2) continue;
    const path = pathFromMonacoUri(marker.resource);
    if (!path || isPageTab(path)) continue;
    (byPath[path] ??= []).push(marker);
    const fc = (fileCounts[path] ??= { ...EMPTY });
    bump(fc, marker.severity);
    bump(total, marker.severity);
  }

  appendTaskMarkers(byPath, fileCounts, total);

  for (const [path, c] of Object.entries(fileCounts)) {
    for (const dir of ancestors(path)) {
      const dc = (dirCounts[dir] ??= { ...EMPTY });
      dc.errors += c.errors;
      dc.warnings += c.warnings;
      dc.infos += c.infos;
    }
  }

  for (const list of Object.values(byPath)) {
    list.sort(
      (a, b) =>
        b.severity - a.severity ||
        a.startLineNumber - b.startLineNumber ||
        a.startColumn - b.startColumn,
    );
  }

  useMarkersStore.setState({ byPath, fileCounts, dirCounts, total });
}

export type TaskMarker = {
  path: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
};

const taskMarkersBySource = new Map<number, TaskMarker[]>();
let monacoRef: typeof monaco | null = null;

export function setTaskMarkers(source: number, markers: TaskMarker[]) {
  taskMarkersBySource.set(source, markers);
  if (monacoRef) rebuild(monacoRef);
}

export function clearTaskMarkers(source: number) {
  if (taskMarkersBySource.delete(source) && monacoRef) rebuild(monacoRef);
}

function appendTaskMarkers(
  byPath: Record<string, monaco.editor.IMarker[]>,
  fileCounts: Record<string, Counts>,
  total: Counts,
) {
  for (const markers of taskMarkersBySource.values()) {
    for (const tm of markers) {
      const severity = tm.severity === "error" ? 8 : 4;
      const marker = {
        owner: "task",
        severity,
        message: tm.message,
        startLineNumber: tm.line,
        startColumn: tm.column,
        endLineNumber: tm.line,
        endColumn: tm.column + 1,
      } as unknown as monaco.editor.IMarker;
      (byPath[tm.path] ??= []).push(marker);
      const fc = (fileCounts[tm.path] ??= { ...EMPTY });
      bump(fc, severity);
      bump(total, severity);
    }
  }
}

let started = false;

export function initMarkers(m: typeof monaco) {
  if (started) return;
  started = true;
  monacoRef = m;
  m.editor.onDidChangeMarkers(() => rebuild(m));
  rebuild(m);
}
