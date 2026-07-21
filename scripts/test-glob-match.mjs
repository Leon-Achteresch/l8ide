import assert from "node:assert";
import { globToRegExp, matchesAnyGlob } from "../src/lib/glob-match.ts";

const m = (glob, path) => globToRegExp(glob).test(path);

assert.ok(m("*.min.js", "app.min.js"));
assert.ok(m("*.min.js", "dir/app.min.js"));
assert.ok(!m("*.min.js", "app.js"));

assert.ok(m("dist/**", "dist/a/b.js"));
assert.ok(m("dist/**", "dist/a.js"));
assert.ok(!m("dist/**", "src/dist/a.js"));

assert.ok(m("**/*.gen.ts", "a.gen.ts"));
assert.ok(m("**/*.gen.ts", "src/x/y.gen.ts"));
assert.ok(!m("**/*.gen.ts", "src/x/y.ts"));

assert.ok(m("src/*.ts", "src/a.ts"));
assert.ok(!m("src/*.ts", "src/a/b.ts"));

assert.ok(m("{a,b}.txt", "a.txt"));
assert.ok(m("{a,b}.txt", "b.txt"));
assert.ok(!m("{a,b}.txt", "c.txt"));

assert.ok(m("file?.log", "file1.log"));
assert.ok(!m("file?.log", "file12.log"));

assert.ok(matchesAnyGlob("build/out.js", ["src/**", "build/**"]));
assert.ok(!matchesAnyGlob("src/app.ts", ["build/**", "*.min.js"]));

console.log("glob-match: OK");
