const IMPORT_RE =
  /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;

export function extractImportSpecifiers(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (spec && !out.includes(spec)) out.push(spec);
  }
  return out;
}

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json"];

export function resolutionCandidates(
  spec: string,
  fromDir: string,
  root: string,
  aliases: Record<string, string>,
): string[] {
  let base: string | null = null;
  if (spec.startsWith(".")) {
    const parts = `${fromDir}/${spec}`.split("/");
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === "." || part === "") continue;
      else if (part === "..") resolved.pop();
      else resolved.push(part);
    }
    base = `/${resolved.join("/")}`;
  } else {
    for (const [alias, target] of Object.entries(aliases)) {
      if (spec === alias || spec.startsWith(`${alias}/`)) {
        base = `${root}/${target}${spec.slice(alias.length)}`;
        break;
      }
    }
  }
  if (!base) return [];
  const candidates: string[] = [];
  for (const ext of EXTENSIONS) candidates.push(`${base}${ext}`);
  for (const ext of EXTENSIONS.slice(1)) candidates.push(`${base}/index${ext}`);
  return candidates;
}
