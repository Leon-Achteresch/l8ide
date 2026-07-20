import assert from "node:assert/strict";
import {
  extractImportSpecifiers,
  resolutionCandidates,
} from "../src/lib/file-deps-core.ts";

const src = `
import { a } from "./foo";
import b from "../bar/baz";
import * as c from "@/lib/utils";
export { d } from "./re-export";
const e = require("node:fs");
const f = await import("./dynamic");
import "side-effect";
import type { T } from "./types";
`;
const specs = extractImportSpecifiers(src);
assert.deepEqual(specs, [
  "./foo",
  "../bar/baz",
  "@/lib/utils",
  "./re-export",
  "node:fs",
  "./dynamic",
  "side-effect",
  "./types",
]);

const cands = resolutionCandidates("./foo", "/repo/src/lib", "/repo", {});
assert.ok(cands.includes("/repo/src/lib/foo.ts"));
assert.ok(cands.includes("/repo/src/lib/foo/index.ts"));

const up = resolutionCandidates("../bar/baz", "/repo/src/lib", "/repo", {});
assert.ok(up.includes("/repo/src/bar/baz.tsx"));

const alias = resolutionCandidates("@/lib/utils", "/repo/src/x", "/repo", {
  "@": "src",
});
assert.ok(alias.includes("/repo/src/lib/utils.ts"));

assert.deepEqual(resolutionCandidates("react", "/repo/src", "/repo", {}), []);

console.log("test-file-deps: ok");
