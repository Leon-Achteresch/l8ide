export function isPathTrusted(trusted: string[], path: string | null): boolean {
  if (!path) return true;
  return trusted.some(
    (t) =>
      t.length > 0 &&
      (path === t || path.startsWith(`${t}/`) || path.startsWith(`${t}\\`)),
  );
}
