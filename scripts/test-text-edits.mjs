import assert from "node:assert/strict";
import { applyTextChangesToString } from "../src/lib/text-edits.ts";

const src = "const a = 1;\nconst b = 2;\n";

assert.equal(
  applyTextChangesToString(src, [
    { span: { start: 6, length: 1 }, newText: "x" },
  ]),
  "const x = 1;\nconst b = 2;\n",
  "single replacement",
);

assert.equal(
  applyTextChangesToString(src, [
    { span: { start: 6, length: 1 }, newText: "x" },
    { span: { start: 19, length: 1 }, newText: "y" },
  ]),
  "const x = 1;\nconst y = 2;\n",
  "two replacements stay aligned regardless of order",
);

assert.equal(
  applyTextChangesToString(src, [
    { span: { start: 19, length: 1 }, newText: "y" },
    { span: { start: 6, length: 1 }, newText: "x" },
  ]),
  "const x = 1;\nconst y = 2;\n",
  "unsorted input yields identical result",
);

assert.equal(
  applyTextChangesToString(src, [
    { span: { start: 0, length: 0 }, newText: "// head\n" },
  ]),
  "// head\nconst a = 1;\nconst b = 2;\n",
  "pure insertion",
);

assert.equal(
  applyTextChangesToString(src, [
    { span: { start: 0, length: src.length }, newText: "export {};\n" },
  ]),
  "export {};\n",
  "full-file replacement",
);

assert.equal(applyTextChangesToString(src, []), src, "no changes is identity");

console.log("test-text-edits: all assertions passed");
