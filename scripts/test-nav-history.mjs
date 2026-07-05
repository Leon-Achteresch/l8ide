import assert from "node:assert/strict";
import { canBack, canForward, pushEntry } from "../src/lib/nav-history-core.ts";

let s = { entries: [], index: -1 };
const loc = (path, line) => ({ path, line, column: 1 });

s = pushEntry(s, loc("a.ts", 10));
assert.deepEqual([s.entries.length, s.index], [1, 0]);

assert.equal(pushEntry(s, loc("a.ts", 12)), null);

s = pushEntry(s, loc("a.ts", 40));
assert.deepEqual([s.entries.length, s.index], [2, 1]);

s = pushEntry(s, loc("b.ts", 5));
assert.deepEqual([s.entries.length, s.index], [3, 2]);
assert.equal(canBack(s), true);
assert.equal(canForward(s), false);

s = { ...s, index: 1 };
assert.equal(canForward(s), true);
s = pushEntry(s, loc("c.ts", 1));
assert.deepEqual(
  [s.entries.map((e) => e.path).join(","), s.index],
  ["a.ts,a.ts,c.ts", 2],
);
assert.equal(canForward(s), false);

let big = { entries: [], index: -1 };
for (let i = 0; i < 60; i++) big = pushEntry(big, loc(`f${i}.ts`, 1));
assert.equal(big.entries.length, 50);
assert.equal(big.entries[0].path, "f10.ts");

console.log("nav-history: all assertions passed");
