import {
  extractImportSpecifiers,
  resolutionCandidates,
} from "./file-deps-core.ts";

export type ModuleNode = { id: string; files: number };
export type ModuleEdge = { from: string; to: string; count: number };

export function moduleOf(relPath: string): string {
  const parts = relPath.split("/");
  if (parts.length <= 2) return parts.length === 1 ? "(root)" : parts[0];
  return parts.slice(0, 2).join("/");
}

export function buildModuleGraph(
  sources: { path: string; content: string }[],
  root: string,
  aliases: Record<string, string>,
): { nodes: ModuleNode[]; edges: ModuleEdge[] } {
  const fileSet = new Set(sources.map((s) => s.path));
  const fileCounts = new Map<string, number>();
  const edgeCounts = new Map<string, number>();

  for (const { path } of sources) {
    const rel = path.slice(root.length + 1);
    const mod = moduleOf(rel);
    fileCounts.set(mod, (fileCounts.get(mod) ?? 0) + 1);
  }

  for (const { path, content } of sources) {
    const rel = path.slice(root.length + 1);
    const fromMod = moduleOf(rel);
    const dir = path.slice(0, path.lastIndexOf("/"));
    for (const spec of extractImportSpecifiers(content)) {
      const resolved = resolutionCandidates(spec, dir, root, aliases).find(
        (c) => fileSet.has(c),
      );
      if (!resolved) continue;
      const toMod = moduleOf(resolved.slice(root.length + 1));
      if (toMod === fromMod) continue;
      const key = `${fromMod}→${toMod}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }

  const nodes = [...fileCounts.entries()]
    .map(([id, files]) => ({ id, files }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 20);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [...edgeCounts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("→");
      return { from, to, count };
    })
    .filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))
    .sort((a, b) => b.count - a.count);
  return { nodes, edges };
}
