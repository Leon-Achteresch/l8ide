import assert from "node:assert/strict";
import { encodeSemanticTokens } from "../src/lib/semantic-encode.ts";

function positionAtFor(text) {
  return (offset) => {
    let lineNumber = 1;
    let column = 1;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === "\n") {
        lineNumber++;
        column = 1;
      } else {
        column++;
      }
    }
    return { lineNumber, column };
  };
}

const cls = (type, mods = 0) => ((type + 1) << 8) | mods;

const text = "ab\ncde\nfg";
const positionAt = positionAtFor(text);

const spans = [
  0, 1, cls(7),
  3, 1, cls(9),
  5, 1, cls(8, 1 << 3),
  7, 1, cls(0),
];

assert.deepEqual(
  encodeSemanticTokens(spans, positionAt),
  [0, 0, 1, 7, 0, 1, 0, 1, 9, 0, 0, 2, 1, 8, 8, 1, 0, 1, 0, 0],
  "delta-encodes across and within lines, passes modifiers through",
);

assert.deepEqual(
  encodeSemanticTokens([0, 3, 0], positionAt),
  [],
  "skips tokens whose classification has no type",
);

assert.deepEqual(encodeSemanticTokens([], positionAt), [], "empty input");

console.log("ok");
