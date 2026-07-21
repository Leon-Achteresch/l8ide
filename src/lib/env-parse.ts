export type EnvLine =
  | { kind: "pair"; key: string; value: string; raw: string }
  | { kind: "comment"; raw: string }
  | { kind: "blank"; raw: string };

const PAIR = /^(\s*)([A-Za-z_][A-Za-z0-9_.]*)\s*=(.*)$/;

export function parseEnv(text: string): EnvLine[] {
  return text.split("\n").map((raw) => {
    if (raw.trim() === "") return { kind: "blank", raw };
    if (raw.trimStart().startsWith("#")) return { kind: "comment", raw };
    const m = PAIR.exec(raw);
    if (!m) return { kind: "comment", raw };
    return { kind: "pair", key: m[2], value: m[3].trim(), raw };
  });
}

export function setEnvValue(
  lines: EnvLine[],
  key: string,
  value: string,
): EnvLine[] {
  return lines.map((l) =>
    l.kind === "pair" && l.key === key
      ? { kind: "pair", key, value, raw: `${key}=${value}` }
      : l,
  );
}

export function serializeEnv(lines: EnvLine[]): string {
  return lines.map((l) => l.raw).join("\n");
}

export function maskValue(value: string): string {
  const unquoted = value.replace(/^["']|["']$/g, "");
  if (unquoted.length === 0) return "";
  if (unquoted.length <= 4) return "•".repeat(unquoted.length);
  return `${unquoted.slice(0, 2)}${"•".repeat(Math.min(12, unquoted.length - 4))}${unquoted.slice(-2)}`;
}
