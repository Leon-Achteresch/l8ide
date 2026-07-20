export type A11yFinding = {
  line: number;
  column: number;
  message: string;
};

const TAG = /<([a-z][a-z0-9]*)\b([^>]*?)(\/?)>/gi;

function hasAttr(attrs: string, name: string): boolean {
  return new RegExp(`(^|\\s)${name}([\\s=>]|$)`, "i").test(attrs);
}

function attrValue(attrs: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(attrs);
  return m ? m[1] : null;
}

export function lintA11y(source: string): A11yFinding[] {
  const findings: A11yFinding[] = [];
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++)
    if (source[i] === "\n") lineStarts.push(i + 1);
  const locate = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - lineStarts[lo] + 1 };
  };

  for (const m of source.matchAll(TAG)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const at = () => locate(m.index ?? 0);

    if (tag === "img" && !hasAttr(attrs, "alt")) {
      const p = at();
      findings.push({ ...p, message: "<img> ohne alt-Attribut" });
    }
    if (tag === "a") {
      const href = attrValue(attrs, "href");
      if (href !== null && (href === "" || href === "#")) {
        const p = at();
        findings.push({ ...p, message: "<a> mit leerem href — ggf. <button> nutzen" });
      }
    }
    if (
      hasAttr(attrs, "onclick") &&
      !["button", "a", "input", "select", "textarea"].includes(tag) &&
      !hasAttr(attrs, "role")
    ) {
      const p = at();
      findings.push({
        ...p,
        message: `onClick auf <${tag}> ohne role — nicht per Tastatur bedienbar`,
      });
    }
    const tabindex = attrValue(attrs, "tabindex") ?? attrValue(attrs, "tabIndex");
    if (tabindex && Number(tabindex) > 0) {
      const p = at();
      findings.push({ ...p, message: `Positiver tabindex (${tabindex}) stört die Tab-Reihenfolge` });
    }
    if (tag === "html" && !hasAttr(attrs, "lang")) {
      const p = at();
      findings.push({ ...p, message: "<html> ohne lang-Attribut" });
    }
  }
  return findings;
}
