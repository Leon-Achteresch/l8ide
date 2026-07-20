export function expressionStart(line: string, dotIndex: number): number | null {
  let i = dotIndex - 1;
  let depth = 0;
  while (i >= 0) {
    const c = line[i];
    if (c === ")" || c === "]") {
      depth++;
      i--;
      continue;
    }
    if (c === "(" || c === "[") {
      if (depth === 0) break;
      depth--;
      i--;
      continue;
    }
    if (depth > 0) {
      i--;
      continue;
    }
    if (/[\w$.]/.test(c) || c === '"' || c === "'" || c === "`") {
      i--;
      continue;
    }
    break;
  }
  const start = i + 1;
  if (depth !== 0 || start >= dotIndex) return null;
  const expr = line.slice(start, dotIndex);
  if (!expr.trim() || expr === "this") return null;
  if (/^\d+$/.test(expr)) return null;
  return start;
}
