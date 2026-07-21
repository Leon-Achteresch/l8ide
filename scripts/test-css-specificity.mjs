import assert from "node:assert";
import { specificity } from "../src/lib/css-specificity-core.ts";

const cases = [
  ["#id", [1, 0, 0]],
  [".a.b", [0, 2, 0]],
  ["div p", [0, 0, 2]],
  ["ul li a", [0, 0, 3]],
  ["a:hover", [0, 1, 1]],
  ["#nav .item a::before", [1, 1, 2]],
  ['input[type="text"]', [0, 1, 1]],
  [":not(.foo).bar", [0, 2, 0]],
  [":where(#x) .y", [0, 1, 0]],
  ["li:nth-child(2n+1)", [0, 1, 1]],
  ["*", [0, 0, 0]],
  ["h1 + p", [0, 0, 2]],
  [":is(#a, .b) span", [1, 0, 1]],
];

for (const [sel, want] of cases) {
  const got = specificity(sel);
  assert.deepStrictEqual(got, want, `${sel} → ${got} (want ${want})`);
}

console.log("css-specificity: OK");
