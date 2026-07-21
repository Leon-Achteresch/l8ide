import assert from "node:assert/strict";

// btoa/atob exist in Node 24 globally
import { runTransform, TRANSFORMS } from "../src/lib/text-transforms.ts";

assert.equal(runTransform("base64.encode", "hello"), "aGVsbG8=");
assert.equal(runTransform("base64.decode", "aGVsbG8="), "hello");
// round-trip with unicode
const uni = "Grüße 🚀";
assert.equal(
  runTransform("base64.decode", runTransform("base64.encode", uni)),
  uni,
);

assert.equal(runTransform("url.encode", "a b&c"), "a%20b%26c");
assert.equal(runTransform("url.decode", "a%20b%26c"), "a b&c");

assert.equal(runTransform("json.minify", '{ "a": 1,  "b": 2 }'), '{"a":1,"b":2}');
assert.equal(runTransform("json.pretty", '{"a":1}'), '{\n  "a": 1\n}');
assert.equal(runTransform("json.escape", 'he said "hi"'), '"he said \\"hi\\""');

// JWT: header {alg} . payload {sub} . sig
const enc = (o) =>
  Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "");
const jwt = `${enc({ alg: "HS256" })}.${enc({ sub: "42" })}.sig`;
const decoded = JSON.parse(runTransform("jwt.decode", jwt));
assert.equal(decoded.header.alg, "HS256");
assert.equal(decoded.payload.sub, "42");

assert.throws(() => runTransform("jwt.decode", "notajwt"));
assert.throws(() => runTransform("nope", "x"));

// case conversions round-trip across styles
assert.equal(runTransform("case.camel", "my_variable_name"), "myVariableName");
assert.equal(runTransform("case.camel", "my-variable-name"), "myVariableName");
assert.equal(runTransform("case.pascal", "my variable"), "MyVariable");
assert.equal(runTransform("case.snake", "myVariableName"), "my_variable_name");
assert.equal(runTransform("case.kebab", "MyVariableName"), "my-variable-name");
assert.equal(runTransform("case.constant", "myVar"), "MY_VAR");
// digits stay attached
assert.equal(runTransform("case.snake", "item2Name"), "item2_name");
assert.equal(runTransform("case.camel", "HTTP_SERVER"), "httpServer");

assert.ok(TRANSFORMS.length >= 13);

console.log("test-text-transforms: ok");
