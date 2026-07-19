import assert from "node:assert/strict";
import { nestEntries, nestParentFor } from "../src/lib/file-nesting.ts";

const f = (name) => ({ name, isDirectory: false });
const d = (name) => ({ name, isDirectory: true });

const sibs = new Set(["foo.ts", "foo.js", "foo.d.ts", "bar.tsx", "bar.jsx", "app.css", "app.css.map", "package.json", "package-lock.json", "bun.lock"]);
assert.equal(nestParentFor("foo.js", sibs), "foo.ts");
assert.equal(nestParentFor("foo.d.ts", sibs), "foo.ts");
assert.equal(nestParentFor("bar.jsx", sibs), "bar.tsx");
assert.equal(nestParentFor("app.css.map", sibs), "app.css");
assert.equal(nestParentFor("package-lock.json", sibs), "package.json");
assert.equal(nestParentFor("bun.lock", sibs), "package.json");
assert.equal(nestParentFor("foo.ts", sibs), null);
assert.equal(nestParentFor("lonely.js", sibs), null);
assert.equal(nestParentFor("foo.js", new Set(["foo.js"])), null);

const entries = [d("src"), f("foo.ts"), f("foo.js"), f("foo.d.ts"), f("readme.md"), f("package.json"), f("package-lock.json")];
const nested = nestEntries(entries);
assert.deepEqual(nested.map((e) => e.name), ["src", "foo.ts", "readme.md", "package.json"]);
assert.deepEqual(nested.find((e) => e.name === "foo.ts").nested.map((e) => e.name), ["foo.js", "foo.d.ts"]);
assert.deepEqual(nested.find((e) => e.name === "package.json").nested.map((e) => e.name), ["package-lock.json"]);
assert.equal(nested.find((e) => e.name === "readme.md").nested, undefined);

const flat = [f("a.md"), f("b.md")];
assert.equal(nestEntries(flat), flat);

console.log("test-file-nesting: ok");
