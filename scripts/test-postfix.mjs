import assert from "node:assert/strict";
import { expressionStart } from "../src/lib/postfix-core.ts";

const line1 = "  user.name.log";
assert.equal(expressionStart(line1, line1.lastIndexOf(".")), 2);

const line2 = "const x = getValue(a, b).if";
assert.equal(expressionStart(line2, line2.lastIndexOf(".")), 10);

const line3 = "items[0].return";
assert.equal(expressionStart(line3, line3.lastIndexOf(".")), 0);

assert.equal(expressionStart("this.log", 4), null);

const line5 = "a + b.not";
assert.equal(expressionStart(line5, line5.lastIndexOf(".")), 4);

assert.equal(expressionStart("123.log", 3), null);
assert.equal(expressionStart(".log", 0), null);

const line6 = '"text".log';
assert.equal(expressionStart(line6, line6.lastIndexOf(".")), 0);

const line7 = "if (a) b(c(d)).log";
assert.equal(expressionStart(line7, line7.lastIndexOf(".")), 7);

console.log("test-postfix: ok");
