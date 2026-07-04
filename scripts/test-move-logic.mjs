import assert from "node:assert/strict";
import {
  basename,
  canMove,
  dragRoots,
  parentDir,
  remap,
} from "../src/lib/fs-move.ts";

assert.equal(parentDir("/a/b/c.txt"), "/a/b");
assert.equal(basename("/a/b/c.txt"), "c.txt");
assert.equal(basename("file.txt"), "file.txt");

assert.ok(canMove("/a/b/file.txt", "/a"), "move to grandparent");
assert.ok(canMove("/a/b", "/a/c"), "move dir to sibling");
assert.ok(canMove("/a/bc", "/a/b"), "prefix sibling is not a subtree");
assert.ok(!canMove("/a/b", "/a/b"), "onto itself");
assert.ok(!canMove("/a/b/file.txt", "/a/b"), "into own parent");
assert.ok(!canMove("/a/b", "/a/b/c"), "into own child");
assert.ok(!canMove("/a/b", "/a/b/c/d"), "into own subtree");

assert.deepEqual(
  dragRoots(["/a/b", "/a/b/c", "/a/b/c/d.txt", "/a/d"]),
  ["/a/b", "/a/d"],
  "nested selections collapse to roots",
);
assert.deepEqual(
  dragRoots(["/a/bc", "/a/b"]),
  ["/a/bc", "/a/b"],
  "prefix siblings are kept",
);
assert.deepEqual(dragRoots([]), []);

const map = remap("/a/b", "/x/b");
assert.equal(map("/a/b"), "/x/b");
assert.equal(map("/a/b/c/d.txt"), "/x/b/c/d.txt");
assert.equal(map("/a/bc.txt"), "/a/bc.txt", "prefix sibling untouched");
assert.equal(map("/other"), "/other");

console.log("test-move-logic: all assertions passed");
