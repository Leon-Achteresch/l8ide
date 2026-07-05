import assert from "node:assert/strict";
import {
  collectLeaves,
  removeLeaf,
  splitLeaf,
} from "../src/lib/editor-groups.ts";

const leaf = { type: "leaf", id: "a" };

const split = splitLeaf(leaf, "a", "b", "s1", "row");
assert.deepEqual(collectLeaves(split), ["a", "b"]);
assert.equal(split.type === "split" && split.direction, "row");

const split3 = splitLeaf(split, "b", "c", "s2", "row");
assert.deepEqual(collectLeaves(split3), ["a", "b", "c"]);
assert.equal(split3.type === "split" && split3.children.length, 3);

const grid = splitLeaf(split3, "b", "d", "s3", "col");
assert.deepEqual(collectLeaves(grid), ["a", "b", "d", "c"]);
assert.equal(collectLeaves(grid).length, 4);

const removed = removeLeaf(grid, "d");
assert.deepEqual(collectLeaves(removed), ["a", "b", "c"]);

const collapsed = removeLeaf(split, "b");
assert.deepEqual(collapsed, leaf);

console.log("test-editor-groups: all assertions passed");
