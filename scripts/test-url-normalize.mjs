import assert from "node:assert/strict";
import { BROWSER_HOME, normalizeUrl } from "../src/lib/url-normalize.ts";

assert.equal(normalizeUrl(""), "");
assert.equal(normalizeUrl("   "), "");
assert.equal(normalizeUrl("https://github.com"), "https://github.com");
assert.equal(normalizeUrl("http://example.com/a"), "http://example.com/a");
assert.equal(normalizeUrl("github.com"), "https://github.com");
assert.equal(normalizeUrl("github.com/tauri"), "https://github.com/tauri");
assert.equal(normalizeUrl("localhost:5173"), "http://localhost:5173");
assert.equal(normalizeUrl("localhost"), "http://localhost");
assert.equal(normalizeUrl("127.0.0.1:8080"), "http://127.0.0.1:8080");
assert.equal(normalizeUrl("tauri dpi"), `${BROWSER_HOME}/?q=tauri%20dpi`);
assert.equal(normalizeUrl("what is rust"), `${BROWSER_HOME}/?q=what%20is%20rust`);

console.log("test-url-normalize: all assertions passed");
