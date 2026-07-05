export function languageOf(file: string): string {
  if (/\.tsx?$/i.test(file)) return "typescript";
  if (/\.(jsx?|mjs|cjs)$/i.test(file)) return "javascript";
  if (/\.json$/i.test(file)) return "json";
  if (/\.css$/i.test(file)) return "css";
  if (/\.html?$/i.test(file)) return "html";
  if (/\.md$/i.test(file)) return "markdown";
  if (/\.rs$/i.test(file)) return "rust";
  if (/\.(ya?ml)$/i.test(file)) return "yaml";
  return "plaintext";
}
