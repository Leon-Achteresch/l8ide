export function trimTrailingWhitespace(text: string): string {
  return text.replace(/[ \t]+(\r?\n)/g, "$1").replace(/[ \t]+$/, "");
}

export function ensureFinalNewline(text: string): string {
  if (text.length === 0) return text;
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function applyOnSaveTransforms(
  text: string,
  opts: { trim: boolean; finalNewline: boolean },
): string {
  let out = text;
  if (opts.trim) out = trimTrailingWhitespace(out);
  if (opts.finalNewline) out = ensureFinalNewline(out);
  return out;
}
