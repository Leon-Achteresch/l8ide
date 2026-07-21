export type Heading = { level: number; text: string; slug: string };

const START = "<!-- toc -->";
const END = "<!-- /toc -->";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  for (const raw of markdown.split("\n")) {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*$/.exec(raw);
    if (!m) continue;
    const text = m[2].trim();
    let slug = slugify(text);
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    if (n > 0) slug = `${slug}-${n}`;
    headings.push({ level: m[1].length, text, slug });
  }
  return headings;
}

export function buildToc(markdown: string): string {
  const headings = extractHeadings(markdown).filter((h) => h.level >= 2);
  if (headings.length === 0) return "";
  const min = Math.min(...headings.map((h) => h.level));
  const lines = headings.map(
    (h) => `${"  ".repeat(h.level - min)}- [${h.text}](#${h.slug})`,
  );
  return lines.join("\n");
}

export function upsertToc(markdown: string): string {
  const toc = buildToc(markdown);
  const block = `${START}\n${toc}\n${END}`;
  const startIdx = markdown.indexOf(START);
  const endIdx = markdown.indexOf(END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return (
      markdown.slice(0, startIdx) +
      block +
      markdown.slice(endIdx + END.length)
    );
  }
  return `${block}\n\n${markdown}`;
}
