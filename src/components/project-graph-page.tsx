import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Loader2, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { SPRING_LAYOUT } from "@/lib/ease";
import {
  buildModuleGraph,
  type ModuleEdge,
  type ModuleNode,
} from "@/lib/project-graph-core";
import { useWorkspaceStore } from "@/lib/workspace-store";

const SIZE = 760;
const CX = SIZE / 2;
const CY = SIZE / 2 - 20;
const R = 280;
const SOURCE_RE = /\.(tsx?|jsx?|mjs|cjs)$/;
const MAX_FILES = 400;

type Graph = { nodes: ModuleNode[]; edges: ModuleEdge[] };

function nodePos(index: number, total: number) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
}

export function ProjectGraphPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    void (async () => {
      const root = rootPath.replace(/\/+$/, "");
      const all = await invoke<string[]>("list_files", {
        root,
        hidden: [],
      }).catch(() => [] as string[]);
      const files = all.filter((f) => SOURCE_RE.test(f)).slice(0, MAX_FILES);
      const sources = await Promise.all(
        files.map(async (path) => ({
          path,
          content: await readTextFile(path).catch(() => ""),
        })),
      );
      if (!cancelled) setGraph(buildModuleGraph(sources, root, { "@": "src" }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  if (!graph) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Analysiere Projektstruktur…
      </div>
    );
  }

  const positions = new Map(
    graph.nodes.map((n, i) => [n.id, nodePos(i, graph.nodes.length)]),
  );
  const maxCount = Math.max(1, ...graph.edges.map((e) => e.count));
  const isDimmed = (edge: ModuleEdge) =>
    selected !== null && edge.from !== selected && edge.to !== selected;

  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Waypoints className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          Projekt-Graph
        </span>
        <span className="text-[11px] text-muted-foreground">
          {graph.nodes.length} Module · {graph.edges.length} Beziehungen ·
          Klick auf ein Modul hebt seine Kanten hervor
        </span>
      </div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE - 40}`}
        className="mx-auto block h-auto w-full max-w-4xl"
      >
        {graph.edges.map((e) => {
          const from = positions.get(e.from);
          const to = positions.get(e.to);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2 + (CX - (from.x + to.x) / 2) * 0.35;
          const my = (from.y + to.y) / 2 + (CY - (from.y + to.y) / 2) * 0.35;
          return (
            <path
              key={`${e.from}→${e.to}`}
              d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.8 + (e.count / maxCount) * 3.2}
              className={
                isDimmed(e) ? "text-foreground/[0.04]" : "text-foreground/20"
              }
            />
          );
        })}
        {graph.nodes.map((n) => {
          const pos = positions.get(n.id);
          if (!pos) return null;
          const label = `${n.id} · ${n.files}`;
          const w = Math.min(220, label.length * 6.2 + 22);
          const active = selected === n.id;
          return (
            <motion.g
              key={n.id}
              layout
              animate={{ x: pos.x - w / 2, y: pos.y - 14 }}
              transition={SPRING_LAYOUT}
              style={{ cursor: "pointer" }}
              onClick={() => setSelected(active ? null : n.id)}
            >
              <rect
                width={w}
                height={28}
                rx={9}
                strokeWidth={1}
                className={
                  active
                    ? "fill-primary/15 stroke-primary/50"
                    : "fill-background stroke-foreground/20"
                }
              />
              <text
                x={w / 2}
                y={18}
                textAnchor="middle"
                className={active ? "fill-foreground font-medium" : "fill-foreground/80"}
                style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
              >
                {label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
