import assert from "node:assert";
import {
  buildTaskCommand,
  parseTasks,
  resolveTaskCommands,
} from "../src/lib/tasks-json-core.ts";

const jsonc = `{
  // VS Code tasks
  "version": "2.0.0",
  "tasks": [
    { "label": "Build", "type": "shell", "command": "npm run build", "args": ["--mode", "prod"] },
    { "label": "Serve", "type": "shell", "command": "node server.js", "options": { "cwd": "\${workspaceFolder}/api" }, "isBackground": true },
    { "type": "npm", "script": "lint" }
  ]
}`;

const tasks = parseTasks(jsonc);
assert.strictEqual(tasks.length, 2);
assert.strictEqual(tasks[0].label, "Build");
assert.deepStrictEqual(tasks[0].args, ["--mode", "prod"]);
assert.strictEqual(tasks[1].isBackground, true);
assert.strictEqual(tasks[1].cwd, "${workspaceFolder}/api");

const ctx = { workspaceFolder: "/home/p", file: "/home/p/x.ts" };
assert.strictEqual(
  buildTaskCommand(tasks[0], ctx),
  "npm run build '--mode' 'prod'",
);
assert.strictEqual(
  buildTaskCommand(tasks[1], ctx),
  "cd '/home/p/api' && node server.js",
);

assert.deepStrictEqual(parseTasks("{ broken"), []);
assert.deepStrictEqual(parseTasks('{"tasks": []}'), []);

const compound = parseTasks(`{
  "tasks": [
    { "label": "build", "command": "npm run build" },
    { "label": "lint", "command": "npm run lint" },
    { "label": "ci", "dependsOn": ["build", "lint"], "dependsOrder": "sequence" },
    { "label": "both", "dependsOn": ["build", "lint"] }
  ]
}`);
const byLabel = new Map(compound.map((t) => [t.label, t]));
const ctx2 = { workspaceFolder: "/w", file: null };

const ci = compound.find((t) => t.label === "ci");
assert.strictEqual(
  resolveTaskCommands(ci, byLabel, ctx2),
  "npm run build && npm run lint",
);

const both = compound.find((t) => t.label === "both");
assert.strictEqual(
  resolveTaskCommands(both, byLabel, ctx2),
  "{ npm run build; } & { npm run lint; } & wait",
);

const cyc = parseTasks(`{
  "tasks": [
    { "label": "a", "command": "echo a", "dependsOn": ["b"] },
    { "label": "b", "command": "echo b", "dependsOn": ["a"] }
  ]
}`);
const cycMap = new Map(cyc.map((t) => [t.label, t]));
const resolvedA = resolveTaskCommands(cyc[0], cycMap, ctx2);
assert.ok(resolvedA.includes("echo a") && resolvedA.includes("echo b"));

console.log("tasks-json: OK");
