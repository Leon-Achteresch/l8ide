import { useState } from "react";
import { ChevronRight, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadCalls,
  useCallHierarchy,
  type Direction,
} from "@/lib/call-hierarchy";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { openFileAt } from "@/lib/monaco-navigation";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import type { CallHierarchyNode } from "@/lib/ts-refactor";
import { TypeHierarchyDialog } from "@/components/type-hierarchy-dialog";
import { useWorkspaceStore } from "@/lib/workspace-store";

function toPath(fileUri: string): string {
  const m = getMonacoInstance();
  if (!m) return fileUri;
  try {
    return pathFromMonacoUri(m.Uri.parse(fileUri));
  } catch {
    return fileUri;
  }
}

function relLabel(fileUri: string): string {
  const path = toPath(fileUri);
  const root = useWorkspaceStore.getState().rootPath;
  return root && path.startsWith(`${root}/`)
    ? path.slice(root.length + 1)
    : path;
}

function jump(fileUri: string, line: number, column: number) {
  useCallHierarchy.getState().close();
  openFileAt(toPath(fileUri), { line, column });
}

function CallNode({
  node,
  depth,
  direction,
}: {
  node: CallHierarchyNode;
  depth: number;
  direction: Direction;
}) {
  const [children, setChildren] = useState<CallHierarchyNode[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const expand = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (children !== null) return;
    const m = getMonacoInstance();
    const model = m?.editor.getModels()[0];
    if (!model) return;
    setLoading(true);
    setChildren(await loadCalls(model, node.file, node.offset, direction));
    setLoading(false);
  };

  return (
    <div>
      <div
        className="group flex h-7 items-center gap-1 rounded-md pr-1 text-xs hover:bg-foreground/[0.04]"
        style={{ paddingLeft: depth * 14 }}
      >
        <button
          type="button"
          onClick={() => void expand()}
          disabled={depth >= 5}
          className="shrink-0 disabled:opacity-30"
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="block"
          >
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </motion.span>
        </button>
        <button
          type="button"
          onClick={() => jump(node.file, node.line, node.column)}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
        >
          <span className="font-mono font-medium text-foreground">
            {node.name}
          </span>
          <span className="min-w-0 truncate text-[10px] text-muted-foreground">
            {relLabel(node.file)}:{node.line}
          </span>
        </button>
      </div>
      {open && (
        <div>
          {loading ? (
            <p
              className="py-1 text-[11px] text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * 14 + 18 }}
            >
              Lädt…
            </p>
          ) : children && children.length > 0 ? (
            children.map((c, i) => (
              <CallNode
                key={`${c.file}:${c.offset}:${i}`}
                node={c}
                depth={depth + 1}
                direction={direction}
              />
            ))
          ) : (
            <p
              className="py-1 text-[11px] text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * 14 + 18 }}
            >
              {direction === "incoming" ? "Keine Aufrufer." : "Keine Aufrufe."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CallHierarchyContent() {
  const root = useCallHierarchy((s) => s.root);
  const close = useCallHierarchy((s) => s.close);
  if (!root) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {root.direction === "incoming" ? (
              <PhoneIncoming className="size-4 text-muted-foreground" />
            ) : (
              <PhoneOutgoing className="size-4 text-muted-foreground" />
            )}
            {root.direction === "incoming"
              ? "Eingehende Aufrufe"
              : "Ausgehende Aufrufe"}{" "}
            · <span className="font-mono">{root.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {root.calls.length === 0 ? (
            <p className="py-3 text-xs text-muted-foreground">
              {root.direction === "incoming"
                ? "Keine Aufrufer gefunden."
                : "Keine Aufrufe gefunden."}
            </p>
          ) : (
            root.calls.map((c, i) => (
              <CallNode
                key={`${c.file}:${c.offset}:${i}`}
                node={c}
                depth={0}
                direction={root.direction}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CallHierarchyDialog() {
  return <><CallHierarchyContent /><TypeHierarchyDialog /></>;
}
