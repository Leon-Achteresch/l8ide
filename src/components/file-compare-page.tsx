import { DiffEditor } from "@monaco-editor/react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { type CompareSide, useFileCompare } from "@/lib/file-compare";
import { ideMonacoTheme } from "@/lib/ide-theme";

function loadSide(side: CompareSide): Promise<string> {
  if (side.text != null) return Promise.resolve(side.text);
  if (side.path) return readTextFile(side.path).catch(() => "");
  return Promise.resolve("");
}

export function FileComparePage({ route }: { route: string }) {
  const descriptor = useFileCompare((s) => s.compares[route]);
  const { resolvedTheme } = useTheme();
  const [sideBySide, setSideBySide] = useState(true);
  const [left, setLeft] = useState<string | null>(null);
  const [right, setRight] = useState<string | null>(null);

  useEffect(() => {
    if (!descriptor) return;
    let cancelled = false;
    void Promise.all([loadSide(descriptor.left), loadSide(descriptor.right)]).then(
      ([l, r]) => {
        if (!cancelled) {
          setLeft(l);
          setRight(r);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [descriptor]);

  if (!descriptor) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Kein Vergleich ausgewählt.
      </div>
    );
  }
  if (left === null || right === null) {
    return <div className="p-4 text-sm text-muted-foreground">Lädt…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-3">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {descriptor.left.label} ↔ {descriptor.right.label}
        </span>
        <button
          type="button"
          onClick={() => setSideBySide((v) => !v)}
          className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          {sideBySide ? "Inline" : "Nebeneinander"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <DiffEditor
          key={`${route}:${sideBySide}`}
          height="100%"
          language={descriptor.language}
          original={left}
          modified={right}
          theme={ideMonacoTheme(resolvedTheme === "dark")}
          options={{
            readOnly: true,
            renderSideBySide: sideBySide,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 12,
            renderOverviewRuler: false,
          }}
        />
      </div>
    </div>
  );
}
