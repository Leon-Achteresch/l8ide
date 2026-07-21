import assert from "node:assert";
import { overallPct, parseCoverage } from "../src/lib/coverage-core.ts";

const istanbul = JSON.stringify({
  "/abs/a.js": {
    path: "/abs/a.js",
    statementMap: {
      0: { start: { line: 1 }, end: { line: 1 } },
      1: { start: { line: 2 }, end: { line: 2 } },
      2: { start: { line: 3 }, end: { line: 3 } },
      3: { start: { line: 3 }, end: { line: 3 } },
    },
    s: { 0: 5, 1: 0, 2: 0, 3: 2 },
  },
});

const cov = parseCoverage(istanbul);
const a = cov["/abs/a.js"];
assert.strictEqual(a.lines[1], true);
assert.strictEqual(a.lines[2], false);
assert.strictEqual(a.lines[3], true);
assert.strictEqual(a.total, 3);
assert.strictEqual(a.covered, 2);
assert.strictEqual(a.pct, 66.7);

assert.strictEqual(overallPct(cov), 66.7);

assert.deepStrictEqual(parseCoverage("not json"), {});
assert.deepStrictEqual(parseCoverage("{}"), {});

console.log("coverage: OK");
