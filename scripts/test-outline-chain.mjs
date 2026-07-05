import assert from "node:assert/strict";
import { symbolChainAt } from "../src/lib/outline-chain.ts";

const tree = [
  {
    name: "ClassA",
    line: 1,
    endLine: 20,
    children: [
      { name: "methodX", line: 3, endLine: 8, children: [] },
      { name: "methodY", line: 10, endLine: 18, children: [] },
    ],
  },
  { name: "fnB", line: 22, endLine: 30, children: [] },
];

const names = (line) => symbolChainAt(tree, line).map((n) => n.name);

assert.deepEqual(names(5), ["ClassA", "methodX"]);
assert.deepEqual(names(12), ["ClassA", "methodY"]);
assert.deepEqual(names(2), ["ClassA"]);
assert.deepEqual(names(25), ["fnB"]);
assert.deepEqual(names(21), []);
assert.deepEqual(names(9), ["ClassA"]);

console.log("outline-chain: all assertions passed");
