import { useEffect, useState } from "react";
import type * as monaco from "monaco-editor";
import { ChevronRight } from "lucide-react";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { openFileAt } from "@/lib/monaco-navigation";
import {
  getOutline,
  isOutlineLanguage,
  kindIcon,
  type OutlineNode,
} from "@/lib/outline";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

export function OutlinePanel() {
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const [nodes, setNodes] = useState<OutlineNode[]>([]);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disposers: (() => void)[] = [];
    const m = getMonacoInstance();

    const refresh = async () => {
      const result = await getOutline(activeFile ?? "");
      if (!cancelled) setNodes(result);
    };

    const attach = (model: monaco.editor.ITextModel) => {
      setSupported(isOutlineLanguage(model.getLanguageId()));
      void refresh();
      const sub = model.onDidChangeContent(() => {
        clearTimeout(timer);
        timer = setTimeout(refresh, 400);
      });
      disposers.push(() => sub.dispose());
    };

    if (activeFile && !isPageTab(activeFile) && m) {
      const uri = monacoUriForPath(activeFile);
      const model = m.editor.getModel(uri);
      if (model) {
        attach(model);
      } else {
        setSupported(false);
        setNodes([]);
        const created = m.editor.onDidCreateModel((late) => {
          if (late.uri.toString() === uri.toString()) attach(late);
        });
        disposers.push(() => created.dispose());
      }
    } else {
      setSupported(false);
      setNodes([]);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      disposers.forEach((d) => d());
    };
  }, [activeFile]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Gliederung
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {nodes.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            {supported ? "Keine Symbole" : "Keine Gliederung für diese Datei"}
          </p>
        ) : (
          nodes.map((node, i) => (
            <OutlineRow key={i} node={node} depth={0} path={activeFile!} />
          ))
        )}
      </div>
    </div>
  );
}

function OutlineRow({
  node,
  depth,
  path,
}: {
  node: OutlineNode;
  depth: number;
  path: string;
}) {
  const [open, setOpen] = useState(true);
  const Icon = kindIcon(node.kind);
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className="flex items-center gap-1 rounded-md py-0.5 pr-1 text-sm hover:bg-foreground/[0.06]"
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          >
            <ChevronRight
              className={cn("size-3 transition-transform", open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => openFileAt(path, { line: node.line, column: node.column })}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {open &&
        node.children.map((child, i) => (
          <OutlineRow key={i} node={child} depth={depth + 1} path={path} />
        ))}
    </>
  );
}
