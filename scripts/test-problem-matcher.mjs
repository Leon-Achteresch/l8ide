import assert from "node:assert/strict";
import {
  isCleanCompile,
  isCompileRestart,
  parseTscLine,
  stripAnsi,
} from "../src/lib/problem-matcher.ts";

assert.equal(stripAnsi("\x1b[31mrot\x1b[0m"), "rot");
assert.equal(stripAnsi("\x1b]633;A\x07text"), "text");

let p = parseTscLine("src/foo.ts(12,5): error TS2304: Cannot find name 'x'.");
assert.deepEqual(p, {
  file: "src/foo.ts",
  line: 12,
  column: 5,
  severity: "error",
  message: "Cannot find name 'x'. (TS2304)",
});

p = parseTscLine("src/bar.tsx:3:1 - warning TS6133: 'y' is declared but never used.");
assert.equal(p.severity, "warning");
assert.equal(p.file, "src/bar.tsx");
assert.equal(p.line, 3);

assert.equal(parseTscLine("npm run build"), null);
assert.equal(parseTscLine("Found 3 errors in 2 files."), null);

assert.ok(isCompileRestart("[10:00:00] File change detected. Starting incremental compilation..."));
assert.ok(isCompileRestart("[10:00:00] Starting compilation in watch mode..."));
assert.ok(!isCompileRestart("hello"));
assert.ok(isCleanCompile("[10:00:01] Found 0 errors. Watching for file changes."));
assert.ok(!isCleanCompile("Found 2 errors."));

console.log("test-problem-matcher: ok");
