export type TextChange = {
  span: { start: number; length: number };
  newText: string;
};

export function applyTextChangesToString(
  text: string,
  changes: TextChange[],
): string {
  const sorted = [...changes].sort((a, b) => b.span.start - a.span.start);
  let out = text;
  for (const c of sorted) {
    out =
      out.slice(0, c.span.start) +
      c.newText +
      out.slice(c.span.start + c.span.length);
  }
  return out;
}
