import assert from "node:assert";
import { buildSystemPrompt } from "../src/lib/ai/system-prompt.ts";

const base = buildSystemPrompt({ rootPath: "/p", activeFile: "/p/a.ts" });
assert.ok(!base.includes("Projekt-Anweisungen"));
assert.ok(base.includes("/p/a.ts"));

const withCi = buildSystemPrompt({
  rootPath: "/p",
  customInstructions: "Immer TypeScript strict verwenden.",
});
assert.ok(withCi.includes("Projekt-Anweisungen"));
assert.ok(withCi.includes("Immer TypeScript strict verwenden."));

const blank = buildSystemPrompt({ rootPath: "/p", customInstructions: "   " });
assert.ok(!blank.includes("Projekt-Anweisungen"));

const none = buildSystemPrompt();
assert.ok(!none.includes("Projekt-Anweisungen"));
assert.ok(none.length > 0);

console.log("system-prompt: OK");
