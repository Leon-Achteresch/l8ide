export const BROWSER_HOME = "https://duckduckgo.com";

export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(value))
    return `http://${value}`;
  if (/^[^\s./]+\.[^\s]+$/.test(value)) return `https://${value}`;
  return `${BROWSER_HOME}/?q=${encodeURIComponent(value)}`;
}
