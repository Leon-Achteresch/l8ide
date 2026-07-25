import assert from "node:assert";
import { TAG_TONES, TAG_TONE_CLASS, toneFor } from "../src/lib/tag-tone.ts";

for (const tone of TAG_TONES) {
  assert.ok(TAG_TONE_CLASS[tone], `missing class for tone ${tone}`);
}

assert.equal(toneFor("TypeScript"), toneFor("TypeScript"));
assert.equal(toneFor(""), TAG_TONES[0]);

const labels = ["TypeScript", "Rust", "CSS", "JSON", "Markdown", "Python"];
const used = new Set(labels.map(toneFor));
assert.ok(used.size >= 4, `expected spread across tones, got ${used.size}`);

for (const label of [...labels, "a".repeat(500), "ß€😀"]) {
  assert.ok(TAG_TONES.includes(toneFor(label)), `bad tone for ${label}`);
}

console.log("tag-tone ok");
