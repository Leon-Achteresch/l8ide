import assert from "node:assert";
import { computeGitGraph } from "../src/lib/git-graph-core.ts";

const linear = computeGitGraph([
  { hash: "A", parents: ["B"] },
  { hash: "B", parents: ["C"] },
  { hash: "C", parents: [] },
]);
assert.strictEqual(linear.width, 1);
assert.deepStrictEqual(linear.rows.map((r) => r.col), [0, 0, 0]);
assert.deepStrictEqual(linear.rows[0].edges, []);
assert.deepStrictEqual(linear.rows[1].edges, [{ from: 0, to: 0, color: 0 }]);

const merge = computeGitGraph([
  { hash: "M", parents: ["A", "B"] },
  { hash: "A", parents: ["Base"] },
  { hash: "B", parents: ["Base"] },
  { hash: "Base", parents: [] },
]);
assert.strictEqual(merge.width, 2);
assert.deepStrictEqual(merge.rows.map((r) => r.col), [0, 0, 1, 0]);

const fanOut = merge.rows[1].edges.find((e) => e.from !== e.to);
assert.deepStrictEqual(fanOut, { from: 0, to: 1, color: 1 });

const converge = merge.rows[3].edges.find((e) => e.from !== e.to);
assert.deepStrictEqual(converge, { from: 1, to: 0, color: 1 });

console.log("git-graph: OK");
