import { useEffect, useMemo, useState } from "react";
import type * as monaco from "monaco-editor";
import { ChevronRight } from "lucide-react";
import { useEditorSettings } from "@/lib/editor-settings";
import { revealInEditor } from "@/lib/monaco-navigation";
import {
  getOutline,
  kindIcon,
  type OutlineNode,
  symbolChainAt,
} from "@/lib/outline";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

function segmentsFor(root: string | null, path: string): string[] {
  const rel = root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  return rel.split("/").filter(Boolean);
}

export function Breadcrumbs({
  path,
  editor,
}: {
  path: string;
  editor: monaco.editor.ICodeEditor | null;
}) {
  const enabled = useEditorSettings((s) => s.breadcrumbs);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [line, setLine] = useState(1);
  const [symbols, setSymbols] = useState<OutlineNode[]>([]);

  useEffect(() => {
    if (!editor) return;
    setLine(editor.getPosition()?.lineNumber ?? 1);
    const d = editor.onDidChangeCursorPosition((e) =>
      setLine(e.position.lineNumber),
    );
    return () => d.dispose();
  }, [editor]);

  useEffect(() => {
    if (!enabled || isPageTab(path)) {
      setSymbols([]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () =>
      getOutline(path).then((n) => {
        if (!cancelled) setSymbols(n);
      });
    void refresh();
    const sub = editor?.getModel()?.onDidChangeContent(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 500);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub?.dispose();
    };
  }, [enabled, path, editor]);

  const chain = useMemo(() => symbolChainAt(symbols, line), [symbols, line]);

  if (!enabled || isPageTab(path)) return null;
  const segments = segmentsFor(rootPath, path);

  return (
    <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap border-b px-3 text-xs text-muted-foreground">
      {segments.map((seg, i) => (
        <span key={`p${i}`} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-40" />}
          <span className={cn(i === segments.length - 1 && "text-foreground/75")}>
            {seg}
          </span>
        </span>
      ))}
      {chain.map((sym, i) => {
        const Icon = kindIcon(sym.kind);
        return (
          <button
            key={`s${i}`}
            type="button"
            onClick={() =>
              editor &&
              revealInEditor(editor, { line: sym.line, column: sym.column })
            }
            className="flex shrink-0 items-center gap-0.5 hover:text-foreground"
          >
            <ChevronRight className="size-3 opacity-40" />
            <Icon className="size-3" />
            <span>{sym.name}</span>
          </button>
        );
      })}
    </div>
  );
}
