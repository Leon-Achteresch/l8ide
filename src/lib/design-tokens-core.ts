export type Token = { name: string; value: string; isColor: boolean };

const DECL = /(--[\w-]+)\s*:\s*([^;}]+)[;}]/g;
const COLOR =
  /^(#([0-9a-f]{3,8})|rgb|rgba|hsl|hsla|oklch|oklab|color|lab|lch)\b|^#/i;

export function extractTokens(css: string): Token[] {
  const map = new Map<string, string>();
  for (const m of css.matchAll(DECL)) {
    const name = m[1].trim();
    const value = m[2].trim();
    if (value) map.set(name, value);
  }
  return [...map.entries()].map(([name, value]) => ({
    name,
    value,
    isColor: COLOR.test(value),
  }));
}

export function resolveColor(
  value: string,
  tokens: Map<string, string>,
  depth = 0,
): string {
  if (depth > 8) return value;
  const varMatch = /^var\(\s*(--[\w-]+)/.exec(value.trim());
  if (varMatch) {
    const ref = tokens.get(varMatch[1]);
    return ref ? resolveColor(ref, tokens, depth + 1) : value;
  }
  return value;
}
