import assert from "node:assert/strict";
import { parseDiffRanges } from "../src/lib/git-diff-parse.ts";

const modify = `--- a/f
+++ b/f
@@ -1,3 +1,3 @@
 ctx
-old line
+new line
 ctx2`;
let r = parseDiffRanges(modify);
assert.equal(r.length, 1);
assert.deepEqual(r[0], { start: 2, end: 2, kind: "modify", oldLines: ["old line"] });

const add = `@@ -2,0 +3,2 @@
+a
+b`;
r = parseDiffRanges(add);
assert.deepEqual(r[0], { start: 3, end: 4, kind: "add", oldLines: [] });

const del = `@@ -3,2 +2,0 @@
-gone1
-gone2`;
r = parseDiffRanges(del);
assert.equal(r[0].kind, "delete");
assert.deepEqual(r[0].oldLines, ["gone1", "gone2"]);

const noNewline = `@@ -1 +1 @@
-old
\\ No newline at end of file
+new
\\ No newline at end of file`;
r = parseDiffRanges(noNewline);
assert.deepEqual(r[0], { start: 1, end: 1, kind: "modify", oldLines: ["old"] });

const multi = `@@ -1,2 +1,2 @@
-x
+y
 ctx
@@ -10,2 +10,3 @@
 ctx
+added
 ctx`;
r = parseDiffRanges(multi);
assert.equal(r.length, 2);
assert.equal(r[1].kind, "add");
assert.equal(r[1].start, 11);

console.log("test-diff-parse: ok");
