export type EditorConfigProps = {
  indentStyle?: "tab" | "space";
  indentSize?: number;
  tabWidth?: number;
  endOfLine?: "lf" | "crlf" | "cr";
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
  maxLineLength?: number;
};

export type Section = { glob: string; props: Record<string, string> };
export type Parsed = { root: boolean; sections: Section[] };

export function parse(text: string): Parsed {
  const sections: Section[] = [];
  let root = false;
  let current: Section | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      current = { glob: line.slice(1, -1), props: {} };
      sections.push(current);
      continue;
    }
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();
    if (current) current.props[key] = value;
    else if (key === "root") root = value.toLowerCase() === "true";
  }
  return { root, sections };
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === "," && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

function expandBraces(glob: string): string[] {
  const open = glob.indexOf("{");
  if (open < 0) return [glob];
  let depth = 0;
  let close = open;
  for (; close < glob.length; close++) {
    if (glob[close] === "{") depth++;
    else if (glob[close] === "}" && --depth === 0) break;
  }
  if (close >= glob.length) return [glob];
  const before = glob.slice(0, open);
  const inner = glob.slice(open + 1, close);
  const after = glob.slice(close + 1);
  const parts = splitTopLevel(inner);
  const tails = expandBraces(after);
  if (parts.length < 2) {
    return tails.map((t) => `${before}{${inner}}${t}`);
  }
  const out: string[] = [];
  for (const p of parts.flatMap(expandBraces)) {
    for (const t of tails) out.push(before + p + t);
  }
  return out;
}

function segToRegex(glob: string): string {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "[") {
      let j = i + 1;
      let cls = glob[j] === "!" ? "^" : "";
      if (cls) j++;
      while (j < glob.length && glob[j] !== "]") cls += glob[j++];
      i = j;
      re += `[${cls}]`;
    } else if ("\\^$+.()|".includes(c)) re += `\\${c}`;
    else re += c;
  }
  return re;
}

export function matches(glob: string, relPath: string): boolean {
  for (const g of expandBraces(glob)) {
    const anchored = g.includes("/");
    const body = segToRegex(g.startsWith("/") ? g.slice(1) : g);
    const full = anchored ? `^${body}$` : `^(?:.*/)?${body}$`;
    try {
      if (new RegExp(full).test(relPath)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

export function normalize(p: Record<string, string>): EditorConfigProps {
  const out: EditorConfigProps = {};
  const style = p.indent_style?.toLowerCase();
  if (style === "tab" || style === "space") out.indentStyle = style;
  const tab = p.tab_width ? parseInt(p.tab_width, 10) : NaN;
  if (tab > 0) out.tabWidth = tab;
  const size = p.indent_size;
  if (size && size !== "tab") {
    const n = parseInt(size, 10);
    if (n > 0) out.indentSize = n;
  } else if (size === "tab" && out.tabWidth) out.indentSize = out.tabWidth;
  const eol = p.end_of_line?.toLowerCase();
  if (eol === "lf" || eol === "crlf" || eol === "cr") out.endOfLine = eol;
  if (p.trim_trailing_whitespace != null)
    out.trimTrailingWhitespace = p.trim_trailing_whitespace === "true";
  if (p.insert_final_newline != null)
    out.insertFinalNewline = p.insert_final_newline === "true";
  const mll = p.max_line_length;
  if (mll && mll.toLowerCase() !== "off") {
    const n = parseInt(mll, 10);
    if (n > 0) out.maxLineLength = n;
  }
  return out;
}
