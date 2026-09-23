export function packageNameFromSpecifier(specifier: string): string | null {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("#") || specifier.includes(":") || specifier.includes("\\")) return null;
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return /^@[\w.-]+$/.test(parts[0] ?? "") && /^[\w.-]+$/.test(parts[1] ?? "")
      ? `${parts[0]}/${parts[1]}` : null;
  }
  const name = specifier.split("/")[0] ?? "";
  return /^[\w.-]+$/.test(name) ? name : null;
}

export function importedPackages(source: string): string[] {
  const result = new Set<string>();
  const imports = /\b(?:from|import|require|export)\s*(?:\(\s*)?["']([^"']+)["']|<reference\s+types=["']([^"']+)["']/g;
  for (const match of source.matchAll(imports)) {
    const name = packageNameFromSpecifier(match[1] ?? match[2] ?? "");
    if (name) result.add(name);
  }
  return [...result];
}

export function typePackageName(name: string): string {
  if (name.startsWith("@types/")) return name;
  if (name.startsWith("@")) return `@types/${name.slice(1).replace("/", "__")}`;
  return `@types/${name}`;
}
