import assert from "node:assert/strict";
import ts from "typescript";
import { TypeScriptWorker } from "../node_modules/monaco-editor/esm/vs/language/typescript/tsWorker.js";
import { typescript as monacoTs } from "../node_modules/monaco-editor/esm/vs/language/typescript/lib/typescriptServices.js";
import { getTypeHierarchy } from "../src/lib/type-hierarchy-core.ts";

const file = "/workspace/types.ts";
const source = `
interface Named {}
interface Identified extends Named {}
class Animal implements Named {}
class Dog extends Animal implements Identified {}
class Poodle extends Dog {}
class Cat extends Animal {}
`;
const host = ts.createCompilerHost({ noLib: true, noEmit: true });
host.getSourceFile = (name, languageVersion) =>
  name === file ? ts.createSourceFile(file, source, languageVersion, true) : undefined;
host.fileExists = (name) => name === file;
host.readFile = (name) => name === file ? source : undefined;
const program = ts.createProgram([file], { noLib: true, noEmit: true }, host);

const at = (name) => source.indexOf(name, source.indexOf("class "));
const names = (name, direction) => {
  const result = getTypeHierarchy(ts, program, file, at(name), direction);
  assert.equal(result.root?.name, name);
  return result.types.map((type) => type.name).sort();
};

assert.deepEqual(names("Animal", "base"), ["Named"]);
assert.deepEqual(names("Animal", "derived"), ["Cat", "Dog"]);
assert.deepEqual(names("Dog", "base"), ["Animal", "Identified"]);
assert.deepEqual(names("Dog", "derived"), ["Poodle"]);
assert.deepEqual(names("Poodle", "derived"), []);
assert.deepEqual(names("Cat", "base"), ["Animal"]);
assert.equal(getTypeHierarchy(ts, program, file, source.indexOf("interface Named") + 1, "base").root?.name, "Named");
assert.equal(getTypeHierarchy(ts, program, file, source.length + 1, "base").root, null);

const uri = "file:///workspace/types.ts";
const worker = new TypeScriptWorker({ getMirrorModels: () => [{
  uri: { toString: () => uri, path: "/workspace/types.ts" },
  version: 1,
  getValue: () => source,
}] }, { compilerOptions: { noLib: true }, extraLibs: {} });
const workerProgram = worker.getLanguageService().getProgram();
assert.ok(workerProgram);
assert.deepEqual(
  getTypeHierarchy(monacoTs, workerProgram, uri, at("Animal"), "derived").types.map((type) => type.name).sort(),
  ["Cat", "Dog"],
);

console.log("type-hierarchy: OK");
