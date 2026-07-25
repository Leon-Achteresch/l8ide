import { useEffect, useMemo, useState } from "react";
import type * as monaco from "monaco-editor";
import { Slash } from "lucide-react";
import { revealInTree } from "@/components/file-tree";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { copyPath, copyRelativePath, revealInOs } from "@/lib/path-actions";
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

  const absFor = (index: number) =>
    [rootPath, ...segments.slice(0, index + 1)].filter(Boolean).join("/");

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto whitespace-nowrap px-2.5 text-xs text-muted-foreground">
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          return (
            <span key={`p${i}`} className="flex shrink-0 items-center">
              {i > 0 && <Slash className="size-3 shrink-0 opacity-30" />}
              <button
                type="button"
                onClick={() => revealInTree(absFor(i))}
                className={cn(
                  "rounded-md px-1.5 py-0.5 transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground",
                  isLast && "font-medium text-foreground/80",
                )}
              >
                {seg}
              </button>
            </span>
          );
        })}
        {chain.map((sym, i) => {
          const Icon = kindIcon(sym.kind);
          return (
            <span key={`s${i}`} className="flex shrink-0 items-center">
              <Slash className="size-3 shrink-0 opacity-30" />
              <button
                type="button"
                onClick={() =>
                  editor &&
                  revealInEditor(editor, { line: sym.line, column: sym.column })
                }
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground"
              >
                <Icon className="size-3" />
                <span>{sym.name}</span>
              </button>
            </span>
          );
        })}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-52">
        <ContextMenuItem onClick={() => revealInTree(path)}>
          Im Explorer zeigen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => copyPath(path)}>
          Pfad kopieren
        </ContextMenuItem>
        <ContextMenuItem onClick={() => copyRelativePath(path)}>
          Relativen Pfad kopieren
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => revealInOs(path)}>
          Im Finder zeigen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
