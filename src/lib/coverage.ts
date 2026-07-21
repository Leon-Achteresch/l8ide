import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import {
  overallPct,
  parseCoverage,
  type FileCoverage,
} from "@/lib/coverage-core";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Store = {
  byPath: Record<string, FileCoverage>;
  enabled: boolean;
};

export const useCoverage = create<Store>(() => ({ byPath: {}, enabled: false }));

const REPORTS = [
  "coverage/coverage-final.json",
  ".nyc_output/coverage-final.json",
];

export async function loadCoverage(): Promise<void> {
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
  if (!root) return;
  for (const rel of REPORTS) {
    const path = `${root}/${rel}`;
    if (!(await exists(path).catch(() => false))) continue;
    const cov = parseCoverage(await readTextFile(path).catch(() => ""));
    const count = Object.keys(cov).length;
    if (count === 0) continue;
    useCoverage.setState({ byPath: cov, enabled: true });
    toast.success(
      `Coverage geladen: ${overallPct(cov)}% (${count} Dateien) · ${rel}`,
    );
    return;
  }
  toast.info(
    "Keine coverage-final.json gefunden. Erst z.B. `vitest run --coverage` ausführen.",
  );
}

export function toggleCoverage(): void {
  const s = useCoverage.getState();
  if (Object.keys(s.byPath).length === 0) {
    void loadCoverage();
    return;
  }
  useCoverage.setState({ enabled: !s.enabled });
}

export function attachCoverage(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);

  const render = () => {
    const { byPath, enabled } = useCoverage.getState();
    const file = byPath[absPath];
    const model = editor.getModel();
    if (!enabled || !file || !model) {
      collection.clear();
      return;
    }
    const maxLine = model.getLineCount();
    const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
    for (const [lineStr, hit] of Object.entries(file.lines)) {
      const line = Number(lineStr);
      if (line < 1 || line > maxLine) continue;
      decos.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: hit ? "l8-cov-hit" : "l8-cov-miss",
          ...(hit
            ? {}
            : {
                className: "l8-cov-miss-line",
                minimap: {
                  color: "#f43f5e",
                  position: monaco.editor.MinimapPosition.Inline,
                },
              }),
        },
      });
    }
    collection.set(decos);
  };

  const unsub = useCoverage.subscribe(render);
  render();
  editor.onDidDispose(() => {
    unsub();
    collection.clear();
  });
}
