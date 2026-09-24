import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/file-suggestions.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const values = new Map();
const context = createContext({
  Date,
  exports: {},
  localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
});
new Script(js).runInContext(context);
const { recordFileQuery, recordFileChoice, suggestFiles } = context.exports;
const files = ["/one/src/alpha.ts", "/one/src/beta.ts", "/one/notes.md"];

assert.equal(suggestFiles(files, "beta", { root: "/one" })[0], files[1]);
recordFileQuery("/one", "beta");
recordFileChoice("/one", files[1], "beta");
recordFileChoice("/one", files[1], "beta");
assert.equal(suggestFiles(files, "", { root: "/one" })[0], files[1]);
assert.equal(suggestFiles(files, "", { root: "/two" })[0], files[2]);
assert.equal(suggestFiles(files, "", { root: "/one", pinned: [files[0]] })[0], files[1]);
assert.equal(suggestFiles(files, "", { root: "/two", pinned: [files[0]] })[0], files[0]);
assert.equal(suggestFiles(files, "alpha", { root: "/one" })[0], files[0]);
assert.deepEqual(Array.from(suggestFiles([files[0]], "", { root: "/one" })), [files[0]]);

console.log("test-file-suggestions: ok");
