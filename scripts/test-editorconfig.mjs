import assert from "node:assert/strict";
import {
  matches,
  normalize,
  parse,
} from "../src/lib/editorconfig-glob.ts";

assert.equal(matches("*", "foo.js"), true);
assert.equal(matches("*.js", "dir/foo.js"), true);
assert.equal(matches("*.js", "foo.ts"), false);
assert.equal(matches("*.{js,ts,jsx,tsx}", "a/b/c.tsx"), true);
assert.equal(matches("*.{js,ts}", "c.md"), false);
assert.equal(matches("lib/**.js", "lib/a/b/c.js"), true);
assert.equal(matches("lib/**.js", "src/a.js"), false);
assert.equal(matches("**/foo.js", "a/b/foo.js"), true);
assert.equal(matches("Makefile", "sub/Makefile"), true);
assert.equal(matches("{package.json,.travis.yml}", "x/.travis.yml"), true);
assert.equal(matches("test?.js", "test1.js"), true);
assert.equal(matches("test?.js", "test12.js"), false);
assert.equal(matches("[!abc].js", "d.js"), true);

const cfg = parse(
  [
    "root = true",
    "[*]",
    "indent_style = space",
    "indent_size = 2",
    "end_of_line = lf",
    "[*.md]",
    "trim_trailing_whitespace = false",
    "[Makefile]",
    "indent_style = tab",
    "tab_width = 4",
  ].join("\n"),
);
assert.equal(cfg.root, true);
assert.equal(cfg.sections.length, 3);

const star = normalize(cfg.sections[0].props);
assert.deepEqual(star, { indentStyle: "space", indentSize: 2, endOfLine: "lf" });

const make = normalize(cfg.sections[2].props);
assert.equal(make.indentStyle, "tab");
assert.equal(make.tabWidth, 4);
assert.equal(make.indentSize, undefined);

const md = normalize(cfg.sections[1].props);
assert.equal(md.trimTrailingWhitespace, false);

assert.deepEqual(normalize({ indent_size: "tab", tab_width: "8" }), {
  tabWidth: 8,
  indentSize: 8,
});
assert.deepEqual(normalize({ max_line_length: "off" }), {});

console.log("test-editorconfig: all assertions passed");
