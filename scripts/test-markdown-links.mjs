import assert from "node:assert/strict";
import {
  extractLinks,
  isLocalLink,
  stripAnchor,
} from "../src/lib/markdown-links-core.ts";

assert.equal(isLocalLink("./foo.md"), true);
assert.equal(isLocalLink("../img/x.png"), true);
assert.equal(isLocalLink("https://x.com"), false);
assert.equal(isLocalLink("mailto:a@b.c"), false);
assert.equal(isLocalLink("#anchor"), false);
assert.equal(isLocalLink("//cdn.x/y"), false);
assert.equal(isLocalLink(""), false);

assert.equal(stripAnchor("foo.md#section"), "foo.md");
assert.equal(stripAnchor("foo.md"), "foo.md");

const md = `# Doc
See [guide](./guide.md) and [ext](https://x.com).
![logo](../img/logo.png "title")
Anchor [top](#top).
\`\`\`
[fenced](./ignored.md)
\`\`\`
Inline \`[code](./no.md)\` stays... actually code spans are parsed here (known limitation).`;

const links = extractLinks(md);
const targets = links.map((l) => l.target);
assert.ok(targets.includes("./guide.md"));
assert.ok(targets.includes("https://x.com"));
assert.ok(targets.includes("../img/logo.png"));
assert.ok(targets.includes("#top"));
assert.ok(!targets.includes("./ignored.md")); // fenced excluded

const img = links.find((l) => l.target === "../img/logo.png");
assert.equal(img.isImage, true);
assert.equal(img.line, 3);

// only local, non-anchor links would be checked on disk
const toCheck = links.filter(
  (l) => isLocalLink(l.target) && stripAnchor(l.target),
);
assert.deepEqual(
  toCheck.map((l) => l.target).sort(),
  ["../img/logo.png", "./guide.md"],
);

console.log("test-markdown-links: ok");
