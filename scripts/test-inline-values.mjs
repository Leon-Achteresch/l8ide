import assert from "node:assert";
import { inlineValuesForLine } from "../src/lib/inline-values-core.ts";

const vars = [
  { name: "count", value: "42" },
  { name: "name", value: "hello world" },
  { name: "unused", value: "1" },
];

assert.strictEqual(
  inlineValuesForLine("  return count + 1;", vars),
  "count = 42",
);

assert.strictEqual(
  inlineValuesForLine("  const x = count * count;", vars),
  "count = 42",
);

assert.strictEqual(
  inlineValuesForLine('  log("count is high");', vars),
  null,
);

assert.strictEqual(
  inlineValuesForLine("  f(count, name);", vars),
  "count = 42, name = hello world",
);

assert.strictEqual(inlineValuesForLine("  discount += 1;", vars), null);

const long = [{ name: "s", value: "x".repeat(80) }];
const out = inlineValuesForLine("  y = s;", long);
assert.ok(out.length < 50 && out.endsWith("…"), `truncated: ${out}`);

console.log("inline-values: OK");
