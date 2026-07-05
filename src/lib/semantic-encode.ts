export const SEMANTIC_TOKEN_TYPES = [
  "class",
  "enum",
  "interface",
  "namespace",
  "typeParameter",
  "type",
  "parameter",
  "variable",
  "enumMember",
  "property",
  "function",
  "member",
];

export const SEMANTIC_TOKEN_MODIFIERS = [
  "declaration",
  "static",
  "async",
  "readonly",
  "defaultLibrary",
  "local",
];

const TYPE_OFFSET = 8;
const MODIFIER_MASK = (1 << TYPE_OFFSET) - 1;

export type LineColumn = { lineNumber: number; column: number };

export function encodeSemanticTokens(
  spans: readonly number[],
  positionAt: (offset: number) => LineColumn,
): number[] {
  const data: number[] = [];
  let prevLine = 0;
  let prevChar = 0;
  for (let i = 0; i + 2 < spans.length; i += 3) {
    const start = spans[i]!;
    const length = spans[i + 1]!;
    const classification = spans[i + 2]!;
    const type = (classification >> TYPE_OFFSET) - 1;
    if (type < 0) continue;
    const modifiers = classification & MODIFIER_MASK;
    const pos = positionAt(start);
    const line = pos.lineNumber - 1;
    const char = pos.column - 1;
    const deltaLine = line - prevLine;
    const deltaChar = deltaLine === 0 ? char - prevChar : char;
    data.push(deltaLine, deltaChar, length, type, modifiers);
    prevLine = line;
    prevChar = char;
  }
  return data;
}
