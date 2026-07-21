import assert from "node:assert/strict";
import {
  applyOnSaveTransforms,
  ensureFinalNewline,
  trimTrailingWhitespace,
} from "../src/lib/on-save-transforms.ts";

assert.equal(trimTrailingWhitespace("a  \nb\t\nc   "), "a\nb\nc");
assert.equal(trimTrailingWhitespace("keep\n"), "keep\n");
assert.equal(trimTrailingWhitespace("x \r\ny"), "x\r\ny");
// indentation is preserved, only trailing removed
assert.equal(trimTrailingWhitespace("  code  \n"), "  code\n");

assert.equal(ensureFinalNewline("abc"), "abc\n");
assert.equal(ensureFinalNewline("abc\n"), "abc\n");
assert.equal(ensureFinalNewline(""), "");

assert.equal(
  applyOnSaveTransforms("a  \nb   ", { trim: true, finalNewline: true }),
  "a\nb\n",
);
assert.equal(
  applyOnSaveTransforms("a  \nb", { trim: false, finalNewline: false }),
  "a  \nb",
);
assert.equal(
  applyOnSaveTransforms("a  \nb", { trim: true, finalNewline: false }),
  "a\nb",
);

console.log("test-on-save-transforms: ok");
