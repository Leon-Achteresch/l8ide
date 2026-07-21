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

export const TRANSFORMS: Transform[] = [
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
];

export function runTransform(id: string, input: string): string {
  const t = TRANSFORMS.find((x) => x.id === id);
  if (!t) throw new Error(`Unbekannte Transformation: ${id}`);
  return t.apply(input);
}
