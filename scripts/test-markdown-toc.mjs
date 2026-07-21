import assert from "node:assert/strict";
import {
  buildToc,
  extractHeadings,
  slugify,
  upsertToc,
} from "../src/lib/markdown-toc.ts";

assert.equal(slugify("Hello World!"), "hello-world");
assert.equal(slugify("Teil 2: Über VS Code"), "teil-2-über-vs-code");

const md = `# Title
intro
## Section A
text
### Sub A1
## Section B
\`\`\`
## not a heading (in fence)
\`\`\`
## Section A
dup`;

const hs = extractHeadings(md);
assert.equal(hs.length, 5); // Title, A, Sub A1, B, A(dup) — fenced one excluded
assert.equal(hs[0].level, 1);
assert.deepEqual(
  hs.map((h) => h.slug),
  ["title", "section-a", "sub-a1", "section-b", "section-a-1"],
);

const toc = buildToc(md);
// level-1 excluded, min level = 2
assert.ok(toc.includes("- [Section A](#section-a)"));
assert.ok(toc.includes("  - [Sub A1](#sub-a1)")); // level 3 indented
assert.ok(toc.includes("- [Section A](#section-a-1)")); // dedup slug
assert.ok(!toc.includes("[Title]")); // h1 excluded

// upsert inserts a fresh block, then updates in place
const once = upsertToc(md);
assert.ok(once.startsWith("<!-- toc -->"));
const twice = upsertToc(once);
assert.equal(
  (twice.match(/<!-- toc -->/g) || []).length,
  1,
  "kein doppeltes TOC",
);

console.log("test-markdown-toc: ok");
