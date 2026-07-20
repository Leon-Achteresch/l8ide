import type * as monacoNs from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { openFileAt } from "@/lib/monaco-navigation";
import { useWorkspaceStore } from "@/lib/workspace-store";

type BookmarksStore = {
  byPath: Record<string, number[]>;
  toggle: (path: string, line: number) => void;
  linesFor: (path: string) => number[];
};

export const useBookmarks = create<BookmarksStore>()(
  persist(
    (set, get) => ({
      byPath: {},
      toggle: (path, line) =>
        set((s) => {
          const cur = s.byPath[path] ?? [];
          const has = cur.includes(line);
          const next = has
            ? cur.filter((l) => l !== line)
            : [...cur, line].sort((a, b) => a - b);
          const byPath = { ...s.byPath };
          if (next.length === 0) delete byPath[path];
          else byPath[path] = next;
          return { byPath };
        }),
      linesFor: (path) => get().byPath[path] ?? [],
    }),
    { name: "bookmarks" },
  ),
);

export function attachBookmarks(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  path: string,
) {
  const collection = editor.createDecorationsCollection([]);
  const render = () => {
    const lines = useBookmarks.getState().byPath[path] ?? [];
    collection.set(
      lines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          linesDecorationsClassName: "l8-bookmark",
          overviewRuler: {
            color: "#f59e0b",
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      })),
    );
  };
  let prev = useBookmarks.getState().byPath[path];
  const unsub = useBookmarks.subscribe((s) => {
    if (s.byPath[path] !== prev) {
      prev = s.byPath[path];
      render();
    }
  });
  render();
  editor.onDidDispose(() => {
    unsub();
    collection.clear();
  });
}

function activeEditorPath(): { path: string; line: number } | null {
  const path = useWorkspaceStore.getState().activeFile;
  if (!path) return null;
  return { path, line: 1 };
}

export function toggleBookmarkHere(editor: monacoNs.editor.ICodeEditor) {
  const info = activeEditorPath();
  const line = editor.getPosition()?.lineNumber;
  if (!info || !line) return;
  useBookmarks.getState().toggle(info.path, line);
}

export function jumpBookmark(direction: 1 | -1, currentLine: number) {
  const path = useWorkspaceStore.getState().activeFile;
  if (!path) return;
  const lines = useBookmarks.getState().byPath[path] ?? [];
  if (lines.length === 0) return;
  const next =
    direction === 1
      ? (lines.find((l) => l > currentLine) ?? lines[0])
      : ([...lines].reverse().find((l) => l < currentLine) ??
        lines[lines.length - 1]);
  openFileAt(path, { line: next, column: 1 });
}
