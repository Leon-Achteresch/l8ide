export function symbolChainAt<
  T extends { line: number; endLine: number; children: T[] },
>(nodes: T[], line: number): T[] {
  const chain: T[] = [];
  let level = nodes;
  while (level.length) {
    const match = level.find((n) => line >= n.line && line <= n.endLine);
    if (!match) break;
    chain.push(match);
    level = match.children;
  }
  return chain;
}
