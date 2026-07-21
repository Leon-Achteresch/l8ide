export type MdLink = {
  target: string;
  line: number;
  column: number;
  isImage: boolean;
};

const LINK = /(!?)\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

export function isLocalLink(target: string): boolean {
  if (!target) return false;
  if (/^[a-z]+:/i.test(target)) return false; // http:, mailto:, etc.
  if (target.startsWith("#")) return false; // in-page anchor
  if (target.startsWith("//")) return false; // protocol-relative
  return true;
}

export function stripAnchor(target: string): string {
  const i = target.indexOf("#");
  return i >= 0 ? target.slice(0, i) : target;
}

export function extractLinks(markdown: string): MdLink[] {
  const links: MdLink[] = [];
  const lines = markdown.split("\n");
  let inFence = false;
  lines.forEach((raw, i) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const line = raw.replace(/`[^`]*`/g, (s) => " ".repeat(s.length));
    for (const m of line.matchAll(LINK)) {
      links.push({
        target: m[2],
        line: i + 1,
        column: (m.index ?? 0) + 1,
        isImage: m[1] === "!",
      });
    }
  });
  return links;
}
