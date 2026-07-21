import assert from "node:assert/strict";
import {
  estimateEntriesTokens,
  estimateTokens,
  formatTokens,
} from "../src/lib/token-estimate.ts";

assert.equal(estimateTokens(""), 0);
assert.equal(estimateTokens("abcd"), 1);
assert.equal(estimateTokens("abcde"), 2);
assert.equal(estimateTokens("a".repeat(400)), 100);

assert.equal(
  estimateEntriesTokens([{ text: "abcd" }, { text: "abcd" }, {}]),
  2,
);

assert.equal(formatTokens(0), "0");
assert.equal(formatTokens(999), "999");
assert.equal(formatTokens(1500), "1.5k");
assert.equal(formatTokens(12000), "12.0k");

console.log("test-token-estimate: ok");
