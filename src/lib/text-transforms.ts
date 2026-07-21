import { jsonToTs } from "./json-to-ts-core.ts";

export type Transform = {
  id: string;
  label: string;
  apply: (input: string) => string;
};

function b64encode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}
function b64decode(s: string): string {
  return decodeURIComponent(escape(atob(s.trim())));
}

function decodeJwt(token: string): string {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("Kein JWT (erwarte header.payload.signature)");
  const pad = (p: string) => p.replace(/-/g, "+").replace(/_/g, "/");
  const header = JSON.parse(b64decode(pad(parts[0])));
  const payload = JSON.parse(b64decode(pad(parts[1])));
  return JSON.stringify({ header, payload }, null, 2);
}

export function splitWords(s: string): string[] {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function toCamel(s: string): string {
  const w = splitWords(s);
  return w.map((x, i) => (i === 0 ? x : cap(x))).join("");
}
export function toPascal(s: string): string {
  return splitWords(s).map(cap).join("");
}
export function toSnake(s: string): string {
  return splitWords(s).join("_");
}
export function toKebab(s: string): string {
  return splitWords(s).join("-");
}
export function toConstant(s: string): string {
  return splitWords(s).join("_").toUpperCase();
}

function lines(s: string): string[] {
  return s.split("\n");
}

export function sortLines(s: string, desc = false): string {
  const sorted = lines(s).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
  return (desc ? sorted.reverse() : sorted).join("\n");
}
export function uniqueLines(s: string): string {
  const seen = new Set<string>();
  return lines(s)
    .filter((l) => (seen.has(l) ? false : (seen.add(l), true)))
    .join("\n");
}
export function reverseLines(s: string): string {
  return lines(s).reverse().join("\n");
}

export const TRANSFORMS: Transform[] = [
  { id: "lines.sort", label: "Zeilen sortieren (A→Z)", apply: (s) => sortLines(s) },
  {
    id: "lines.sortDesc",
    label: "Zeilen sortieren (Z→A)",
    apply: (s) => sortLines(s, true),
  },
  { id: "lines.unique", label: "Doppelte Zeilen entfernen", apply: uniqueLines },
  { id: "lines.reverse", label: "Zeilen umkehren", apply: reverseLines },
  { id: "case.camel", label: "camelCase", apply: toCamel },
  { id: "case.pascal", label: "PascalCase", apply: toPascal },
  { id: "case.snake", label: "snake_case", apply: toSnake },
  { id: "case.kebab", label: "kebab-case", apply: toKebab },
  { id: "case.constant", label: "CONSTANT_CASE", apply: toConstant },
  { id: "base64.encode", label: "Base64 kodieren", apply: b64encode },
  { id: "base64.decode", label: "Base64 dekodieren", apply: b64decode },
  {
    id: "url.encode",
    label: "URL kodieren",
    apply: (s) => encodeURIComponent(s),
  },
  {
    id: "url.decode",
    label: "URL dekodieren",
    apply: (s) => decodeURIComponent(s),
  },
  { id: "jwt.decode", label: "JWT dekodieren", apply: decodeJwt },
  {
    id: "json.pretty",
    label: "JSON formatieren",
    apply: (s) => JSON.stringify(JSON.parse(s), null, 2),
  },
  {
    id: "json.minify",
    label: "JSON minifizieren",
    apply: (s) => JSON.stringify(JSON.parse(s)),
  },
  {
    id: "json.escape",
    label: "Als JSON-String escapen",
    apply: (s) => JSON.stringify(s),
  },
  {
    id: "json.tots",
    label: "JSON → TypeScript-Interface",
    apply: (s) => jsonToTs(s, "Root"),
  },
];

export function runTransform(id: string, input: string): string {
  const t = TRANSFORMS.find((x) => x.id === id);
  if (!t) throw new Error(`Unbekannte Transformation: ${id}`);
  return t.apply(input);
}
