import assert from "node:assert/strict";
import { parseDiffRanges } from "../src/lib/git-diff-parse.ts";

const added = `@@ -0,0 +1,3 @@
+line one
+line two
+line three`;
assert.deepEqual(parseDiffRanges(added), [{ start: 1, end: 3, kind: "add", oldLines: [] }]);

const modified = `@@ -4,3 +4,3 @@ ctx
 keep
-old
+new
 keep`;
assert.deepEqual(parseDiffRanges(modified), [{ start: 5, end: 5, kind: "modify", oldLines: ["old"] }]);

const deleted = `@@ -10,4 +10,2 @@
 keep
-gone one
-gone two
 keep`;
assert.deepEqual(parseDiffRanges(deleted), [{ start: 11, end: 11, kind: "delete", oldLines: ["gone one", "gone two"] }]);

const twoHunks = `@@ -1,2 +1,3 @@
 a
+b
 c
@@ -20,2 +21,1 @@
 x
-y`;
assert.deepEqual(parseDiffRanges(twoHunks), [
  { start: 2, end: 2, kind: "add", oldLines: [] },
  { start: 22, end: 22, kind: "delete", oldLines: ["y"] },
]);

assert.deepEqual(parseDiffRanges(""), []);

console.log("test-git-gutter: all assertions passed");
