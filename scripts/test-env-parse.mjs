import assert from "node:assert/strict";
import {
  maskValue,
  parseEnv,
  serializeEnv,
  setEnvValue,
} from "../src/lib/env-parse.ts";

const text = `# config
API_KEY=secret123456
PORT=3000

DB_URL="postgres://x"
not a pair line`;

const lines = parseEnv(text);
assert.equal(lines[0].kind, "comment");
assert.equal(lines[1].kind, "pair");
assert.equal(lines[1].key, "API_KEY");
assert.equal(lines[1].value, "secret123456");
assert.equal(lines[2].kind, "pair");
assert.equal(lines[3].kind, "blank");
assert.equal(lines[4].kind, "pair");
assert.equal(lines[4].value, '"postgres://x"');
assert.equal(lines[5].kind, "comment"); // non-pair falls back to comment/raw

// round-trip preserves content
assert.equal(serializeEnv(lines), text);

// edit only the targeted key
const edited = setEnvValue(lines, "PORT", "8080");
assert.equal(edited[2].value, "8080");
assert.equal(edited[1].value, "secret123456");
assert.ok(serializeEnv(edited).includes("PORT=8080"));

// masking
assert.equal(maskValue("secret123456"), "se••••••••56");
assert.equal(maskValue("abcd"), "••••");
assert.equal(maskValue(""), "");
assert.equal(maskValue('"pw"'), "••"); // quotes stripped before masking

console.log("test-env-parse: ok");
