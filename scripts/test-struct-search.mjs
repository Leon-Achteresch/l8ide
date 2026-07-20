import assert from "node:assert/strict";
import {
  patternToRegex,
  searchStructural,
  structuralReplace,
} from "../src/lib/struct-search-core.ts";

const src = `
const a = foo(1, 2);
let b = foo(bar, baz);
console.log("x");
console.error("y");
if (x) { doThing(); }
`;

let hits = searchStructural(src, "foo($A, $B)");
assert.equal(hits.length, 2);
assert.equal(hits[0].line, 2);
assert.equal(hits[1].line, 3);

hits = searchStructural(src, "console.$M($$$)");
assert.equal(hits.length, 2);
assert.ok(hits[0].text.includes("console.log"));

hits = searchStructural(src, "foo($$$)");
assert.equal(hits.length, 2);

hits = searchStructural(src, "notpresent($A)");
assert.equal(hits.length, 0);

assert.equal(searchStructural(src, "").length, 0);

const re = patternToRegex("foo($A)");
assert.ok(re.source.includes("[\\w$.]+"));

const spaced = "foo(  1 ,  2 )";
assert.equal(searchStructural(spaced, "foo($A , $B)").length, 1);

const rep = structuralReplace(src, "foo($A, $B)", "foo($B, $A)");
assert.equal(rep.count, 2);
assert.ok(rep.output.includes("foo(2, 1)"));
assert.ok(rep.output.includes("foo(baz, bar)"));

const logRep = structuralReplace(src, "console.log($$$)", "logger.debug()");
assert.ok(logRep.output.includes("logger.debug()"));
assert.equal(logRep.count, 1);

const noop = structuralReplace(src, "missing($A)", "x($A)");
assert.equal(noop.count, 0);
assert.equal(noop.output, src);

console.log("test-struct-search: ok");
