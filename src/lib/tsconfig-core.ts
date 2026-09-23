/** Parses the JSON with comments and trailing commas accepted by tsconfig.json. */
export function parseTsconfigJson(text: string): Record<string, unknown> {
  let output = "";
  let quoted = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    const next = text[i + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        output += char;
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quoted) {
      output += char;
      if (char === "\\") output += text[++i] ?? "";
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      output += char;
    } else if (char === "/" && next === "/") {
      lineComment = true;
      i++;
    } else if (char === "/" && next === "*") {
      blockComment = true;
      i++;
    } else {
      output += char;
    }
  }
  let withoutTrailingCommas = "";
  quoted = false;
  for (let i = 0; i < output.length; i++) {
    const char = output[i]!;
    if (quoted) {
      withoutTrailingCommas += char;
      if (char === "\\") withoutTrailingCommas += output[++i] ?? "";
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    if (char === ",") {
      let lookahead = i + 1;
      while (/\s/.test(output[lookahead] ?? "")) lookahead++;
      if (output[lookahead] === "}" || output[lookahead] === "]") continue;
    }
    withoutTrailingCommas += char;
  }
  const value = JSON.parse(withoutTrailingCommas) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("tsconfig muss ein Objekt sein");
  return value as Record<string, unknown>;
}
