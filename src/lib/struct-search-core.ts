export type StructMatch = { line: number; column: number; text: string };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const META = /\$\$\$|\$[A-Za-z_][A-Za-z0-9_]*/g;

export function patternToRegex(pattern: string): RegExp {
  const literalToRegex = (literal: string) =>
    escapeRegExp(literal)
      .replace(/\s+/g, "\\s*")
      .replace(/(\\[([{,])/g, "$1\\s*")
      .replace(/(\\[)\]}])/g, "\\s*$1");
  let out = "";
  let last = 0;
  for (const m of pattern.matchAll(META)) {
    out += literalToRegex(pattern.slice(last, m.index));
    out += m[0] === "$$$" ? "[\\s\\S]*?" : "[\\w$.]+";
    last = m.index + m[0].length;
  }
  out += literalToRegex(pattern.slice(last));
  return new RegExp(out, "g");
}

export function searchStructural(
  source: string,
  pattern: string,
): StructMatch[] {
  const trimmed = pattern.trim();
  if (!trimmed) return [];
  const re = patternToRegex(trimmed);
  const matches: StructMatch[] = [];
  const lineStarts: number[] = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") lineStarts.push(i + 1);
  }
  const locate = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - lineStarts[lo] + 1 };
  };
  for (const m of source.matchAll(re)) {
    if (m.index === undefined) continue;
    if (m[0].length === 0) continue;
    const { line, column } = locate(m.index);
    const preview = m[0].split("\n")[0].slice(0, 120);
    matches.push({ line, column, text: preview });
    if (matches.length >= 500) break;
  }
  return matches;
}
