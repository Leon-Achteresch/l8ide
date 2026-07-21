export type InlineVar = { name: string; value: string };

const MAX_LEN = 40;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function short(value: string): string {
  const v = value.replace(/\s+/g, " ").trim();
  return v.length > MAX_LEN ? `${v.slice(0, MAX_LEN - 1)}…` : v;
}

export function inlineValuesForLine(
  text: string,
  vars: InlineVar[],
): string | null {
  const code = text.replace(/(["'`]).*?\1/g, (m) => " ".repeat(m.length));
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const v of vars) {
    if (seen.has(v.name)) continue;
    if (new RegExp(`\\b${escapeRe(v.name)}\\b`).test(code)) {
      seen.add(v.name);
      parts.push(`${v.name} = ${short(v.value)}`);
    }
  }
  return parts.length ? parts.join(", ") : null;
}
