import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cmds = readFileSync(
  new URL("../src/lib/hotkeys.ts", import.meta.url),
  "utf8",
);
const handlers = readFileSync(
  new URL("../src/components/app-hotkeys.tsx", import.meta.url),
  "utf8",
);

const entries = [
  ...cmds.matchAll(/id:\s*"([^"]+)"[\s\S]*?hotkey:\s*"([^"]+)"/g),
].map((m) => ({ id: m[1], hotkey: m[2] }));

assert.ok(entries.length > 40, "erwarte viele Commands");

const seen = new Map();
const conflicts = [];
for (const { id, hotkey } of entries) {
  if (seen.has(hotkey)) conflicts.push(`${hotkey}: ${seen.get(hotkey)} <-> ${id}`);
  else seen.set(hotkey, id);
}
assert.equal(conflicts.length, 0, `Hotkey-Konflikte:\n${conflicts.join("\n")}`);

const handled = new Set(
  [...handlers.matchAll(/"([\w.]+)":\s*(?:\(|async)/g)].map((m) => m[1]),
);
const NO_HANDLER = new Set(["file.rename", "file.delete"]);
const missing = entries
  .map((e) => e.id)
  .filter(
    (id) =>
      !id.startsWith("tab.goto") && !handled.has(id) && !NO_HANDLER.has(id),
  );
assert.equal(missing.length, 0, `Commands ohne Handler: ${missing.join(", ")}`);

console.log(`test-commands: ok (${entries.length} Commands, keine Konflikte)`);
