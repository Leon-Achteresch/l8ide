export type RegexMatch = {
  index: number;
  length: number;
  text: string;
  groups: string[];
};

export type RegexResult =
  | { ok: true; matches: RegexMatch[] }
  | { ok: false; error: string };

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
): RegexResult {
  if (!pattern) return { ok: true, matches: [] };
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const matches: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(text)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      text: m[0],
      groups: m.slice(1).map((g) => g ?? ""),
    });
    if (m[0].length === 0) re.lastIndex++; // avoid infinite loop on empty match
    if (++guard > 10000) break;
    if (matches.length >= 1000) break;
  }
  return { ok: true, matches };
}
