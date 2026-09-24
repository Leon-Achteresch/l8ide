import { useState } from "react";
import { ChevronRight, GitBranch } from "lucide-react";
import { motion } from "motion/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { openFileAt } from "@/lib/monaco-navigation";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import { loadTypes, useTypeHierarchy } from "@/lib/type-hierarchy";
import type { TypeHierarchyDirection, TypeHierarchyNode } from "@/lib/type-hierarchy-core";
import { useWorkspaceStore } from "@/lib/workspace-store";

function toPath(file: string): string {
  const m = getMonacoInstance();
  if (!m) return file;
  try { return pathFromMonacoUri(m.Uri.parse(file)); }
  catch { return file; }
}

function relativeLabel(file: string): string {
  const path = toPath(file);
  const root = useWorkspaceStore.getState().rootPath;
  return root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function TypeNode({
  node, depth, direction, ancestors,
}: {
  node: TypeHierarchyNode;
  depth: number;
  direction: TypeHierarchyDirection;
  ancestors: ReadonlySet<string>;
}) {
  const [children, setChildren] = useState<TypeHierarchyNode[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const key = `${node.file}:${node.offset}`;
  const circular = ancestors.has(key);
  const nextAncestors = new Set(ancestors).add(key);

  const expand = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (children !== null || circular) return;
    setLoading(true);
    try { setChildren(await loadTypes(node, direction)); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="group flex h-7 items-center gap-1 rounded-md pr-1 text-xs hover:bg-foreground/[0.04]" style={{ paddingLeft: depth * 14 }}>
        <button type="button" onClick={() => void expand()} disabled={circular || depth >= 12} className="shrink-0 disabled:opacity-30" aria-label={`${node.name} aufklappen`}>
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} className="block">
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </motion.span>
        </button>
        <button type="button" onClick={() => {
          useTypeHierarchy.getState().close();
          openFileAt(toPath(node.file), { line: node.line, column: node.column });
        }} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
          <span className="font-mono font-medium text-foreground">{node.name}</span>
          <span className="min-w-0 truncate text-[10px] text-muted-foreground">{relativeLabel(node.file)}:{node.line}</span>
        </button>
      </div>
      {open && !circular && (
        <div>
          {loading ? <p className="py-1 text-[11px] text-muted-foreground" style={{ paddingLeft: (depth + 1) * 14 + 18 }}>Lädt…</p>
            : children?.length ? children.map((child) => <TypeNode key={`${child.file}:${child.offset}`} node={child} depth={depth + 1} direction={direction} ancestors={nextAncestors} />)
              : <p className="py-1 text-[11px] text-muted-foreground" style={{ paddingLeft: (depth + 1) * 14 + 18 }}>Keine weiteren Typen.</p>}
        </div>
      )}
    </div>
  );
}

export function TypeHierarchyDialog() {
  const root = useTypeHierarchy((state) => state.root);
  const close = useTypeHierarchy((state) => state.close);
  if (!root) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <GitBranch className="size-4 text-muted-foreground" />
            {root.direction === "base" ? "Obertypen" : "Untertypen"} · <span className="font-mono">{root.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {root.types.length ? root.types.map((node) => <TypeNode key={`${node.file}:${node.offset}`} node={node} depth={0} direction={root.direction} ancestors={new Set([`${root.file}:${root.offset}`])} />)
            : <p className="py-3 text-xs text-muted-foreground">{root.direction === "base" ? "Keine Obertypen gefunden." : "Keine Untertypen gefunden."}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
