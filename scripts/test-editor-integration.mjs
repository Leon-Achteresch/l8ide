import assert from "node:assert/strict";
import { parseTsconfigJson } from "../src/lib/tsconfig-core.ts";
import { parseBiomeDiagnostics, parseEslintDiagnostics } from "../src/lib/project-diagnostics-core.ts";
import { preferredScript, scriptCommand } from "../src/lib/run-scripts.ts";

const config = parseTsconfigJson(`{
  // URLs and comment-like text inside strings must survive.
  "compilerOptions": {
    "baseUrl": "https://example.test/a//b",
    "paths": { "@/*": ["src/*",], }, /* trailing comments */
  },
}`);
assert.equal(config.compilerOptions.baseUrl, "https://example.test/a//b");
assert.deepEqual(config.compilerOptions.paths, { "@/*": ["src/*"] });

const eslint = parseEslintDiagnostics(JSON.stringify([{
  messages: [{ message: "Unused variable", severity: 2, line: 3, column: 5, endLine: 3, endColumn: 9, ruleId: "no-unused-vars" }],
}]));
assert.equal(eslint[0].severity, 8);
assert.equal(eslint[0].startColumn, 5);
assert.equal(eslint[0].code, "no-unused-vars");

const biome = parseBiomeDiagnostics(JSON.stringify({ diagnostics: [{
  message: "Unsafe comparison",
  severity: "ERROR",
  code: { value: "lint/suspicious/noDoubleEquals" },
  location: { range: { start: { line: 4, column: 2 }, end: { line: 4, column: 4 } } },
}] }));
assert.equal(biome[0].startLineNumber, 4);
assert.equal(biome[0].startColumn, 3);
assert.equal(biome[0].endColumn, 5);
assert.equal(biome[0].severity, 8);

const scripts = [{ name: "build", command: "vite build" }, { name: "dev", command: "vite" }];
assert.equal(preferredScript(scripts), "dev");
assert.equal(preferredScript(scripts, "build"), "build");
assert.equal(scriptCommand("bun", "dev"), "bun run dev");
assert.throws(() => scriptCommand("npm", "dev;echo unsafe"));

console.log("editor-integration: OK");
