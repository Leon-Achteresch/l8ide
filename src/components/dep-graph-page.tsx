import { Loader2, Network } from "lucide-react";
import { motion } from "motion/react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useDepGraph } from "@/lib/dep-graph-store";
import { openFileAt } from "@/lib/monaco-navigation";
import { useWorkspaceStore } from "@/lib/workspace-store";

const W = 900;
const ROW = 44;
const NODE_H = 30;

type NodePos = {
  path: string;
  label: string;
  x: number;
  y: number;
  w: number;
  kind: "center" | "import" | "importer";
};

function shortLabel(path: string, root: string | null): string {
  const rel =
    root && path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  const parts = rel.split("/");
  return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : rel;
}

function nodeWidth(label: string): number {
  return Math.min(260, label.length * 6.4 + 24);
}

function layout(
  center: string,
  importers: string[],
  imports: string[],
  root: string | null,
): { nodes: NodePos[]; height: number } {
  const rows = Math.max(importers.length, imports.length, 1);
  const height = Math.max(rows * ROW + 60, 220);
  const mid = height / 2;
  const nodes: NodePos[] = [];
  const centerLabel = shortLabel(center, root);
  nodes.push({
    path: center,
    label: centerLabel,
    x: W / 2 - nodeWidth(centerLabel) / 2,
    y: mid - NODE_H / 2,
    w: nodeWidth(centerLabel),
    kind: "center",
  });
  importers.forEach((p, i) => {
    const label = shortLabel(p, root);
    const y = mid - ((importers.length - 1) / 2) * ROW + i * ROW - NODE_H / 2;
    nodes.push({ path: p, label, x: 30, y, w: nodeWidth(label), kind: "importer" });
  });
  imports.forEach((p, i) => {
    const label = shortLabel(p, root);
    const w = nodeWidth(label);
    const y = mid - ((imports.length - 1) / 2) * ROW + i * ROW - NODE_H / 2;
    nodes.push({ path: p, label, x: W - 30 - w, y, w, kind: "import" });
  });
  return { nodes, height };
}

function edgePath(from: NodePos, to: NodePos): string {
  const x1 = from.x + from.w;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function DepGraphPage({ route }: { route: string }) {
  const entry = useDepGraph((s) => s.byRoute[route]);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  if (!entry?.result) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Analysiere Abhängigkeiten…
      </div>
    );
  }

  const { result, loading } = entry;
  const { nodes, height } = layout(
    result.path,
    result.importers,
    result.imports,
    rootPath,
  );
  const center = nodes[0];

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Network className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          Abhängigkeits-Graph
        </span>
        <span className="text-[11px] text-muted-foreground">
          Klick zentriert · ⌘Klick öffnet Datei
        </span>
        {loading && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="mx-auto block w-full max-w-5xl"
        style={{ height }}
      >
        {nodes.slice(1).map((n) => (
          <path
            key={`e:${n.path}`}
            d={
              n.kind === "importer"
                ? edgePath(n, center)
                : edgePath(center, n)
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            className="text-foreground/15"
          />
        ))}
        {nodes.map((n) => (
          <motion.g
            key={n.path}
            layout
            initial={false}
            animate={{ x: n.x, y: n.y }}
            transition={SPRING_LAYOUT}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || n.kind === "center") {
                openFileAt(n.path, { line: 1, column: 1 });
              } else {
                void useDepGraph.getState().recenter(route, n.path);
              }
            }}
          >
            <rect
              width={n.w}
              height={NODE_H}
              rx={9}
              className={
                n.kind === "center"
                  ? "fill-primary/12 stroke-primary/40"
                  : "fill-foreground/[0.05] stroke-foreground/15 hover:fill-foreground/[0.1]"
              }
              strokeWidth={1}
            />
            <text
              x={n.w / 2}
              y={NODE_H / 2 + 3.5}
              textAnchor="middle"
              className={
                n.kind === "center"
                  ? "fill-foreground font-medium"
                  : "fill-foreground/80"
              }
              style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            >
              {n.label}
            </text>
          </motion.g>
        ))}
        {result.importers.length === 0 && (
          <text x={30} y={height / 2} className="fill-foreground/40" style={{ fontSize: 11 }}>
            keine Importer
          </text>
        )}
        {result.imports.length === 0 && (
          <text x={W - 130} y={height / 2} className="fill-foreground/40" style={{ fontSize: 11 }}>
            keine Projekt-Importe
          </text>
        )}
      </svg>
    </div>
  );
}
