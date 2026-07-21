function pascal(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9]/g, " ").trim();
  return (
    clean
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") || "Root"
  );
}

function isIdent(key: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(key);
}

type Ctx = { interfaces: string[]; names: Set<string> };

function uniqueName(base: string, ctx: Ctx): string {
  let name = pascal(base);
  let n = 2;
  while (ctx.names.has(name)) name = `${pascal(base)}${n++}`;
  ctx.names.add(name);
  return name;
}

function typeOf(value: unknown, keyHint: string, ctx: Ctx): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const inner = typeOf(value[0], keyHint.replace(/s$/, ""), ctx);
    return `${inner}[]`;
  }
  if (typeof value === "object")
    return buildInterface(value as Record<string, unknown>, keyHint, ctx);
  return typeof value === "number"
    ? "number"
    : typeof value === "boolean"
      ? "boolean"
      : "string";
}

function buildInterface(
  obj: Record<string, unknown>,
  name: string,
  ctx: Ctx,
): string {
  const typeName = uniqueName(name, ctx);
  const fields = Object.entries(obj).map(([key, value]) => {
    const t = typeOf(value, key, ctx);
    const k = isIdent(key) ? key : JSON.stringify(key);
    const opt = value === null ? "?" : "";
    return `  ${k}${opt}: ${t};`;
  });
  ctx.interfaces.push(
    `interface ${typeName} {\n${fields.join("\n")}\n}`,
  );
  return typeName;
}

export function jsonToTs(jsonText: string, rootName = "Root"): string {
  const parsed = JSON.parse(jsonText);
  const ctx: Ctx = { interfaces: [], names: new Set() };
  const root = Array.isArray(parsed)
    ? parsed[0] && typeof parsed[0] === "object"
      ? { items: parsed }
      : null
    : parsed;
  if (root === null || typeof root !== "object") {
    throw new Error("Erwarte ein JSON-Objekt oder -Array von Objekten");
  }
  buildInterface(root as Record<string, unknown>, rootName, ctx);
  return ctx.interfaces.join("\n\n");
}
