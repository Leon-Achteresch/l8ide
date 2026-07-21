import assert from "node:assert/strict";
import { relativePath } from "../src/lib/markdown-path-core.ts";

// sibling file
assert.equal(relativePath("/repo/docs", "/repo/docs/guide.md"), "./guide.md");
// sub directory
assert.equal(
  relativePath("/repo/docs", "/repo/docs/img/logo.png"),
  "./img/logo.png",
);
// parent directory
assert.equal(relativePath("/repo/docs", "/repo/README.md"), "../README.md");
// cousin path
assert.equal(
  relativePath("/repo/src/a", "/repo/src/b/x.ts"),
  "../b/x.ts",
);
// deep up
assert.equal(
  relativePath("/repo/a/b/c", "/repo/x.md"),
  "../../../x.md",
);

console.log("test-md-path: ok");
