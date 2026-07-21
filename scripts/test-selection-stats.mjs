import assert from "node:assert/strict";
import { countWords, selectionStats } from "../src/lib/selection-stats.ts";

assert.equal(countWords("hello world"), 2);
assert.equal(countWords("  spaced   out  words "), 3);
assert.equal(countWords(""), 0);
assert.equal(countWords("one\ntwo\tthree"), 3);
assert.equal(countWords("a.b.c foo()"), 2);

assert.deepEqual(selectionStats(""), { chars: 0, words: 0, lines: 0 });
assert.deepEqual(selectionStats("abc"), { chars: 3, words: 1, lines: 1 });
assert.deepEqual(selectionStats("a b\nc d"), { chars: 7, words: 4, lines: 2 });
assert.deepEqual(selectionStats("x\ny\nz"), { chars: 5, words: 3, lines: 3 });

console.log("test-selection-stats: ok");
