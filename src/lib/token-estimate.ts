export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateEntriesTokens(
  entries: { text?: string; result?: string }[],
): number {
  return entries.reduce(
    (n, e) => n + estimateTokens(e.text ?? "") + estimateTokens(e.result ?? ""),
    0,
  );
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}k`;
}
