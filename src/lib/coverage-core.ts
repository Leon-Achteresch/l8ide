export type FileCoverage = {
  lines: Record<number, boolean>;
  covered: number;
  total: number;
  pct: number;
};

type IstanbulEntry = {
  statementMap?: Record<string, { start?: { line?: number } }>;
  s?: Record<string, number>;
};

export function parseCoverage(jsonText: string): Record<string, FileCoverage> {
  let data: Record<string, IstanbulEntry>;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return {};
  }
  const out: Record<string, FileCoverage> = {};
  for (const [path, entry] of Object.entries(data)) {
    const map = entry?.statementMap;
    const hits = entry?.s;
    if (!map || !hits) continue;
    const lineHits = new Map<number, number>();
    for (const [id, loc] of Object.entries(map)) {
      const line = loc?.start?.line;
      if (typeof line !== "number") continue;
      const h = hits[id] ?? 0;
      lineHits.set(line, Math.max(lineHits.get(line) ?? 0, h));
    }
    const lines: Record<number, boolean> = {};
    let covered = 0;
    for (const [line, h] of lineHits) {
      const hit = h > 0;
      lines[line] = hit;
      if (hit) covered++;
    }
    const total = lineHits.size;
    out[path] = {
      lines,
      covered,
      total,
      pct: total === 0 ? 100 : Math.round((covered / total) * 1000) / 10,
    };
  }
  return out;
}

export function overallPct(cov: Record<string, FileCoverage>): number {
  let covered = 0;
  let total = 0;
  for (const f of Object.values(cov)) {
    covered += f.covered;
    total += f.total;
  }
  return total === 0 ? 100 : Math.round((covered / total) * 1000) / 10;
}
