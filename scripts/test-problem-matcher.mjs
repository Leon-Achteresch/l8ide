import assert from "node:assert/strict";
import {
  isCleanCompile,
  isCompileRestart,
  parseProblemLine,
  parseStylishFile,
  parseStylishProblem,
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

// parseProblemLine covers tsc + eslint-compact + generic
assert.equal(
  parseProblemLine("src/foo.ts(12,5): error TS2304: Cannot find name 'x'.").message,
  "Cannot find name 'x'. (TS2304)",
);

let g = parseProblemLine(
  "/app/src/a.js: line 12, col 5, Error - Missing semicolon (semi)",
);
assert.deepEqual(g, {
  file: "/app/src/a.js",
  line: 12,
  column: 5,
  severity: "error",
  message: "Missing semicolon (semi)",
});

g = parseProblemLine("/app/src/a.js: line 4, col 2, Warning - Unexpected console (no-console)");
assert.equal(g.severity, "warning");
assert.equal(g.message, "Unexpected console (no-console)");

g = parseProblemLine("src/b.js:8:3: error: 'foo' is not defined");
assert.deepEqual(g, {
  file: "src/b.js",
  line: 8,
  column: 3,
  severity: "error",
  message: "'foo' is not defined",
});

g = parseProblemLine("main.c:42:10: warning: unused variable 'z'");
assert.equal(g.severity, "warning");
assert.equal(g.line, 42);

assert.equal(parseProblemLine("just some log output"), null);
assert.equal(parseProblemLine("Building at http://localhost:3000:12:foo"), null);

// ESLint stylish (multi-line): file header + indented problem lines
assert.equal(parseStylishFile("/app/src/component.tsx"), "/app/src/component.tsx");
assert.equal(parseStylishFile("src/a.js"), "src/a.js");
assert.equal(parseStylishFile("  4:2  error  x"), null); // indented → not a header
assert.equal(parseStylishFile("This sentence ends in code.ts"), null); // prose (spaces)
assert.equal(parseStylishFile("✖ 3 problems"), null);

const sp = parseStylishProblem("  12:5   error    Missing semicolon      semi");
assert.deepEqual(sp, {
  line: 12,
  column: 5,
  severity: "error",
  message: "Missing semicolon (semi)",
});
const sp2 = parseStylishProblem("   4:2  warning  Unexpected console statement  no-console");
assert.equal(sp2.severity, "warning");
assert.equal(sp2.message, "Unexpected console statement (no-console)");
assert.equal(parseStylishProblem("not a problem line"), null);

// a rule-less stylish line still parses (message only)
const sp3 = parseStylishProblem("  1:1  error  Parsing error: Unexpected token");
assert.equal(sp3.message, "Parsing error: Unexpected token");

console.log("test-problem-matcher: ok");
