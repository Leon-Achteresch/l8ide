import assert from "node:assert";
import {
  parseLaunchConfigs,
  stripJsonComments,
  substituteVars,
} from "../src/lib/launch-config-core.ts";

assert.strictEqual(
  stripJsonComments('{"a": 1 /* x */, "b": "http://y" // c\n}'),
  '{"a": 1 , "b": "http://y" \n}',
);

const jsonc = `{
  // Debug-Konfigurationen
  "version": "0.2.0",
  "configurations": [
    { "name": "Server", "type": "node", "request": "launch", "program": "\${workspaceFolder}/server.js", "args": ["--port", "3000"], "env": { "NODE_ENV": "dev" } },
    { "name": "Ohne Programm" }
  ]
}`;
const configs = parseLaunchConfigs(jsonc);
assert.strictEqual(configs.length, 1);
assert.strictEqual(configs[0].name, "Server");
assert.deepStrictEqual(configs[0].args, ["--port", "3000"]);
assert.deepStrictEqual(configs[0].env, { NODE_ENV: "dev" });

const ctx = {
  workspaceFolder: "/home/p",
  file: "/home/p/src/app.ts",
  env: { HOME: "/home/x" },
};
assert.strictEqual(substituteVars("${workspaceFolder}/server.js", ctx), "/home/p/server.js");
assert.strictEqual(substituteVars("${relativeFile}", ctx), "src/app.ts");
assert.strictEqual(substituteVars("${fileBasename}", ctx), "app.ts");
assert.strictEqual(substituteVars("${fileBasenameNoExtension}", ctx), "app");
assert.strictEqual(substituteVars("${fileDirname}", ctx), "/home/p/src");
assert.strictEqual(substituteVars("${env:HOME}", ctx), "/home/x");
assert.strictEqual(substituteVars("${unknown}", ctx), "${unknown}");

assert.deepStrictEqual(parseLaunchConfigs("{ not json"), []);

console.log("launch-config: OK");
