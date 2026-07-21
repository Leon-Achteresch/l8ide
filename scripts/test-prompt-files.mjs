import assert from "node:assert";
import { parsePromptFile, renderPrompt } from "../src/lib/prompt-files.ts";

const fm = parsePromptFile(
  "---\ndescription: Baue eine Komponente\nattach: active\n---\nErzeuge eine React-Komponente für ${input}.",
);
assert.strictEqual(fm.description, "Baue eine Komponente");
assert.strictEqual(fm.attachActiveFile, true);
assert.strictEqual(fm.body, "Erzeuge eine React-Komponente für ${input}.");

const plain = parsePromptFile("# Changelog schreiben\n\nFasse die letzten Commits zusammen.");
assert.strictEqual(plain.description, "Changelog schreiben");
assert.strictEqual(plain.attachActiveFile, false);
assert.ok(plain.body.startsWith("# Changelog schreiben"));

assert.strictEqual(
  renderPrompt("Erzeuge eine Komponente für ${input}.", "einen Button"),
  "Erzeuge eine Komponente für einen Button.",
);
assert.strictEqual(
  renderPrompt("Beschreibe {{ input }} genau", "die API"),
  "Beschreibe die API genau",
);
assert.strictEqual(
  renderPrompt("Mach das Projekt schneller.", "Fokus auf Startup"),
  "Mach das Projekt schneller.\n\nFokus auf Startup",
);
assert.strictEqual(
  renderPrompt("Reviewe alles.", ""),
  "Reviewe alles.",
);

console.log("prompt-files: OK");
