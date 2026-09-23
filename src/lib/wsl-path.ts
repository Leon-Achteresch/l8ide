export function wslPath(path: string): { distribution: string; linuxPath: string } | null {
  const normalized = path.replace(/\\/g, "/");
  const match = /^\/\/wsl(?:\.localhost|\$)\/([^/]+)(\/.*)?$/i.exec(normalized);
  if (!match) return null;
  return { distribution: match[1], linuxPath: match[2] || "/" };
}

export function wslWindowsPath(distribution: string, linuxPath: string): string {
  return `//wsl.localhost/${distribution}${linuxPath.startsWith("/") ? linuxPath : `/${linuxPath}`}`;
}
