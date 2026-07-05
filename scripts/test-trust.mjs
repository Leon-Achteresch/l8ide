import assert from "node:assert/strict";
import { isPathTrusted } from "../src/lib/workspace-trust.ts";

assert.ok(isPathTrusted([], null), "no folder open is trusted");
assert.ok(!isPathTrusted([], "/a/b"), "unknown folder is untrusted");
assert.ok(isPathTrusted(["/a/b"], "/a/b"), "exact match");
assert.ok(isPathTrusted(["/a"], "/a/b/c"), "subfolder inherits trust");
assert.ok(isPathTrusted(["C:\\a"], "C:\\a\\b"), "windows subfolder inherits trust");
assert.ok(!isPathTrusted(["/a/b"], "/a/bc"), "prefix sibling is not trusted");
assert.ok(!isPathTrusted(["/a/b"], "/a"), "parent of trusted folder is not trusted");
assert.ok(!isPathTrusted([""], "/a"), "empty trust entry trusts nothing");

console.log("ok");
