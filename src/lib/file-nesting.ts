export type Nestable = { name: string; isDirectory: boolean };

const LOCKFILES = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
];

const DERIVED = /^(.*)\.(js|jsx|js\.map|d\.ts|d\.ts\.map|css\.map)$/;

export function nestParentFor(
  name: string,
  siblings: ReadonlySet<string>,
): string | null {
  if (LOCKFILES.includes(name) && siblings.has("package.json"))
    return "package.json";
  const m = DERIVED.exec(name);
  if (!m) return null;
  const [, base, ext] = m;
  if (ext === "css.map")
    return siblings.has(`${base}.css`) ? `${base}.css` : null;
  const candidates =
    ext === "jsx"
      ? [`${base}.tsx`]
      : [`${base}.ts`, `${base}.tsx`, `${base}.mts`];
  for (const parent of candidates) {
    if (parent !== name && siblings.has(parent)) return parent;
  }
  return null;
}

export function nestEntries<T extends Nestable>(
  entries: T[],
): (T & { nested?: T[] })[] {
  const fileNames = new Set(
    entries.filter((e) => !e.isDirectory).map((e) => e.name),
  );
  const byName = new Map(entries.map((e) => [e.name, e]));
  const groups = new Map<T, T[]>();
  const skip = new Set<T>();
  for (const e of entries) {
    if (e.isDirectory) continue;
    const parentName = nestParentFor(e.name, fileNames);
    const parent = parentName ? byName.get(parentName) : undefined;
    if (!parent || parent === e) continue;
    const list = groups.get(parent) ?? [];
    list.push(e);
    groups.set(parent, list);
    skip.add(e);
  }
  if (skip.size === 0) return entries;
  return entries
    .filter((e) => !skip.has(e))
    .map((e) => (groups.has(e) ? { ...e, nested: groups.get(e) } : e));
}
