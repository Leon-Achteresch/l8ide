import assert from "node:assert/strict";
import { runRegex } from "../src/lib/regex-tester-core.ts";

let r = runRegex("\\d+", "", "a1 b22 c333");
assert.ok(r.ok);
assert.equal(r.matches.length, 3);
assert.deepEqual(
  r.matches.map((m) => m.text),
  ["1", "22", "333"],
);
assert.equal(r.matches[1].index, 4);

// capture groups
r = runRegex("(\\w)=(\\d)", "", "a=1 b=2");
assert.ok(r.ok);
assert.equal(r.matches.length, 2);
assert.deepEqual(r.matches[0].groups, ["a", "1"]);

// case-insensitive flag
r = runRegex("abc", "i", "ABC abc");
assert.ok(r.ok);
assert.equal(r.matches.length, 2);

// invalid pattern
r = runRegex("(", "", "x");
assert.equal(r.ok, false);

// empty match doesn't loop forever
r = runRegex("a*", "", "aXa");
assert.ok(r.ok);
assert.ok(r.matches.length >= 2 && r.matches.length < 100);

// empty pattern yields no matches
r = runRegex("", "", "abc");
assert.ok(r.ok);
assert.equal(r.matches.length, 0);

console.log("test-regex-tester: ok");
