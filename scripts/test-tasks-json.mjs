import assert from "node:assert";
import { buildTaskCommand, parseTasks } from "../src/lib/tasks-json-core.ts";

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

console.log("tasks-json: OK");
