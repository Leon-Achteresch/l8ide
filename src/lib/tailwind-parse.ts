export type DesignSystem = {
  getClassList(): [string, { modifiers: string[] }][];
  getClassOrder(classes: string[]): [string, bigint | null][];
  candidatesToCss(classes: string[]): (string | null)[];
  resolveThemeValue(path: string, forceInline?: boolean): string | undefined;
};

export type Region = { start: number; end: number; value: string };

const TOKEN_SEP = /[\s"'`,]/;

export function scanClassStrings(text: string): Region[] {
  const out: Region[] = [];
  const attr =
    /(?:\bclass|\bclassName)\s*=\s*(?:\{\s*)?(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = attr.exec(text))) {
    const start = m.index + m[0].length - m[2].length - 1;
    out.push({ start, end: start + m[2].length, value: m[2] });
  }
  const fn = /\b(?:cn|clsx|classnames|cx|cva|twMerge|twJoin)\s*\(/g;
  while ((m = fn.exec(text))) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === '"' || ch === "'" || ch === "`") {
        const q = ch;
        const s = i + 1;
        i++;
        while (i < text.length && text[i] !== q) {
          if (text[i] === "\\") i++;
          i++;
        }
        out.push({ start: s, end: i, value: text.slice(s, i) });
      }
      i++;
    }
  }
  const apply = /@apply\b([^;{}]*)[;}]/g;
  while ((m = apply.exec(text))) {
    const start = m.index + m[0].indexOf(m[1]);
    out.push({ start, end: start + m[1].length, value: m[1] });
  }
  return out;
}

export function tokenize(value: string): { token: string; offset: number }[] {
  const out: { token: string; offset: number }[] = [];
  const re = /[^\s"'`,]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) out.push({ token: m[0], offset: m.index });
  return out;
}

export function variantPrefix(token: string): string {
  let depth = 0;
  let last = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) last = i;
  }
  return last < 0 ? "" : token.slice(0, last);
}

export function cssProps(css: string): Set<string> {
  const out = new Set<string>();
  const re = /(?:^|[{;])\s*(-?[a-zA-Z][a-zA-Z0-9-]*)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (!m[1].startsWith("--")) out.add(m[1]);
  }
  return out;
}

const COLOR_RE =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/;
const VAR_RE = /var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,[^)]*)?\)/;

export function parseRootVars(css: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;}]+)[;}]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) if (!out.has(m[1])) out.set(m[1], m[2].trim());
  return out;
}

export function resolveColorString(
  css: string,
  ds: DesignSystem,
  vars?: Map<string, string>,
): string | null {
  const direct = css.match(COLOR_RE);
  if (direct) return direct[0];
  for (let depth = 0; depth < 8; depth++) {
    const v = css.match(VAR_RE);
    if (!v) return null;
    const resolved = ds.resolveThemeValue(v[1], true) ?? vars?.get(v[1]);
    if (!resolved) return null;
    const color = resolved.match(COLOR_RE);
    if (color) return color[0];
    css = resolved;
  }
  return null;
}

export function sortValue(value: string, ds: DesignSystem): string {
  if (value.includes("${") || value.includes("{{")) return value;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return value;
  const order = new Map(ds.getClassOrder(tokens));
  const sorted = tokens
    .map((t, i) => ({ t, i, o: order.get(t) ?? null }))
    .sort((a, b) => {
      if (a.o == null && b.o == null) return a.i - b.i;
      if (a.o == null) return -1;
      if (b.o == null) return 1;
      return a.o < b.o ? -1 : a.o > b.o ? 1 : a.i - b.i;
    })
    .map((x) => x.t);
  const lead = value.match(/^\s*/)![0];
  const trail = value.match(/\s*$/)![0];
  return lead + sorted.join(" ") + trail;
}

export type Conflict = { token: string; offset: number; overriddenBy: string };

export function conflicts(value: string, ds: DesignSystem): Conflict[] {
  const toks = tokenize(value);
  const css = ds.candidatesToCss(toks.map((t) => t.token));
  const props = toks.map((_, i) => (css[i] ? cssProps(css[i]!) : null));
  const out: Conflict[] = [];
  toks.forEach((t, i) => {
    if (css[i] == null) return;
    const prefix = variantPrefix(t.token);
    for (let j = i + 1; j < toks.length; j++) {
      if (css[j] == null || variantPrefix(toks[j].token) !== prefix) continue;
      if ([...props[i]!].some((p) => props[j]!.has(p))) {
        out.push({ token: t.token, offset: t.offset, overriddenBy: toks[j].token });
        break;
      }
    }
  });
  return out;
}

export function tokenAt(
  line: string,
  col: number,
): { start: number; end: number } {
  let start = col;
  while (start > 0 && !TOKEN_SEP.test(line[start - 1])) start--;
  let end = col;
  while (end < line.length && !TOKEN_SEP.test(line[end])) end++;
  return { start, end };
}

export function prefixContext(prefix: string): boolean {
  return (
    /(?:\bclass|\bclassName)\s*=\s*(?:\{\s*)?(["'`])[^"'`]*$/.test(prefix) ||
    /\b(?:cn|clsx|classnames|cx|cva|twMerge|twJoin)\s*\([^)]*(["'`])[^"'`]*$/.test(
      prefix,
    ) ||
    /@apply\b[^;{}]*$/.test(prefix)
  );
}
