export type GraphInput = { hash: string; parents: string[] };

export type GraphEdge = { from: number; to: number; color: number };

export type GraphRow = {
  col: number;
  color: number;
  edges: GraphEdge[];
};

export type GitGraph = { rows: GraphRow[]; width: number };

type Lane = { hash: string; color: number; fromCol: number };

export function computeGitGraph(commits: GraphInput[]): GitGraph {
  const lanes: (Lane | null)[] = [];
  let nextColor = 0;
  const rows: GraphRow[] = [];
  let width = 1;

  for (const c of commits) {
    let col = lanes.findIndex((l) => l && l.hash === c.hash);
    let color: number;
    if (col === -1) {
      col = lanes.indexOf(null);
      if (col === -1) col = lanes.length;
      color = nextColor++ % 8;
    } else {
      color = lanes[col]!.color;
    }

    const edges: GraphEdge[] = [];
    for (let j = 0; j < lanes.length; j++) {
      const l = lanes[j];
      if (!l) continue;
      edges.push({ from: l.fromCol, to: l.hash === c.hash ? col : j, color: l.color });
    }

    for (let j = 0; j < lanes.length; j++) {
      const l = lanes[j];
      if (l && l.hash !== c.hash) l.fromCol = j;
    }
    for (let j = 0; j < lanes.length; j++) {
      if (lanes[j] && lanes[j]!.hash === c.hash) lanes[j] = null;
    }

    const parents = c.parents ?? [];
    lanes[col] = parents[0]
      ? { hash: parents[0], color, fromCol: col }
      : null;
    for (let p = 1; p < parents.length; p++) {
      let pcol = lanes.indexOf(null);
      if (pcol === -1) pcol = lanes.length;
      lanes[pcol] = { hash: parents[p], color: nextColor++ % 8, fromCol: col };
    }

    const touched = Math.max(col, ...edges.flatMap((e) => [e.from, e.to]), lanes.length - 1);
    width = Math.max(width, touched + 1);
    rows.push({ col, color, edges });
  }

  return { rows, width };
}
