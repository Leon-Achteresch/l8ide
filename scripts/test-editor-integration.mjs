import assert from "node:assert/strict";
import { parseTsconfigJson } from "../src/lib/tsconfig-core.ts";
import { parseBiomeDiagnostics, parseBiomeFindings, parseEslintDiagnostics, parseEslintFindings } from "../src/lib/project-diagnostics-core.ts";
import { preferredScript, scriptCommand } from "../src/lib/run-scripts.ts";
import { importedPackages, packageNameFromSpecifier, typePackageName } from "../src/lib/monaco-declarations-core.ts";
import { monacoDeclarationUriForPath, monacoUriForPath } from "../src/lib/monaco-uri.ts";
import { TypeScriptWorker } from "../node_modules/monaco-editor/esm/vs/language/typescript/tsWorker.js";
import { typescript as ts } from "../node_modules/monaco-editor/esm/vs/language/typescript/lib/typescriptServices.js";

assert.deepEqual(importedPackages(`import React from "react"; import("@tanstack/react-query"); require("./local"); export * from "pkg/subpath"; /// <reference types="node" />`), ["react", "@tanstack/react-query", "pkg", "node"]);
assert.equal(packageNameFromSpecifier("https://example.test/a"), null);
assert.equal(typePackageName("@scope/name"), "@types/scope__name");

const fileName = "file:///workspace/src/App.tsx";
const model = {
  uri: { toString: () => fileName, path: "/workspace/src/App.tsx" },
  version: 1,
  getValue: () => 'import { value } from "example"; value;',
};
const declarations = {
  "file:///workspace/node_modules/example/package.json": { content: '{"name":"example","types":"index.d.ts"}', version: 1 },
  "file:///workspace/node_modules/example/index.d.ts": { content: "export const value: number;", version: 1 },
};
const worker = new TypeScriptWorker({ getMirrorModels: () => [model] }, {
  compilerOptions: { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.ESNext },
  extraLibs: declarations,
});
assert.deepEqual(await worker.getSemanticDiagnostics(fileName), []);
const unresolved = new TypeScriptWorker({ getMirrorModels: () => [model] }, {
  compilerOptions: { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.ESNext },
  extraLibs: {},
});
assert.ok((await unresolved.getSemanticDiagnostics(fileName)).some((diagnostic) => diagnostic.code === 2307));

const jsxRoot = "/workspace/my project";
const jsxFile = monacoUriForPath(`${jsxRoot}/src/App.tsx`).toString();
const jsxDeclaration = monacoDeclarationUriForPath(`${jsxRoot}/node_modules/@types/react/jsx-runtime.d.ts`);
assert.equal(jsxDeclaration, "file:///workspace/my%20project/node_modules/@types/react/jsx-runtime.d.ts");
const jsxWorker = new TypeScriptWorker({ getMirrorModels: () => [{
  uri: { toString: () => jsxFile, path: `${jsxRoot}/src/App.tsx` },
  version: 1,
  getValue: () => "export const App = () => <div />;",
}] }, {
  compilerOptions: { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  extraLibs: { [jsxDeclaration]: { content: "export namespace JSX { interface Element {} interface IntrinsicElements { div: {}; } }", version: 1 } },
});
assert.ok(!(await jsxWorker.getSemanticDiagnostics(jsxFile)).some((diagnostic) => diagnostic.code === 2875));

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

const eslintFixes = parseEslintFindings(JSON.stringify([{ messages: [{
  message: "Missing semicolon", severity: 2, line: 1, column: 16,
  fix: { range: [15, 15], text: ";" },
  suggestions: [{ desc: "Remove declaration", fix: { range: [0, 15], text: "" } }],
}] }]), "const value = 1\n");
assert.deepEqual(eslintFixes[0].fixes[0].range, {
  startLineNumber: 1, startColumn: 16, endLineNumber: 1, endColumn: 16,
});
assert.equal(eslintFixes[0].fixes[1].title, "Remove declaration");

const biomeFixes = parseBiomeFindings(JSON.stringify({ diagnostics: [{
  message: "Use strict equality", severity: "ERROR",
  location: { range: { start: { line: 1, column: 4 }, end: { line: 1, column: 6 } } },
  suggestions: [{ range: { start: { line: 1, column: 5 }, end: { line: 1, column: 5 } }, text: "=" }],
}] }));
assert.equal(biomeFixes[0].fixes[0].range.startColumn, 6);
assert.equal(biomeFixes[0].fixes[0].text, "=");

const scripts = [{ name: "build", command: "vite build" }, { name: "dev", command: "vite" }];
assert.equal(preferredScript(scripts), "dev");
assert.equal(preferredScript(scripts, "build"), "build");
assert.equal(scriptCommand("bun", "dev"), "bun run dev");
assert.throws(() => scriptCommand("npm", "dev;echo unsafe"));

console.log("editor-integration: OK");
