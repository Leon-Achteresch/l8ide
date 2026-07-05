import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanClassStrings,
  tokenize,
  sortValue,
  conflicts,
  resolveColorString,
  parseRootVars,
  prefixContext,
  tokenAt,
} from "../src/lib/tailwind-parse.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { __unstable__loadDesignSystem } = await import(
  join(root, "node_modules/tailwindcss/dist/lib.mjs")
);
const bundled = (id) => {
  const key = id.replace(/\.css$/, "");
  const file = key === "tailwindcss" ? "index" : key.replace("tailwindcss/", "");
  return readFileSync(join(root, "node_modules/tailwindcss", file + ".css"), "utf8");
};
const loadStylesheet = async (id, base) => ({
  path: id,
  base,
  content: id.startsWith("tailwindcss") ? bundled(id) : "",
});
const loadModule = async () => {
  throw new Error("skip");
};
const ds = await __unstable__loadDesignSystem(readFileSync(join(root, "src/App.css"), "utf8"), {
  base: join(root, "src"),
  loadStylesheet,
  loadModule,
});

// --- scanClassStrings ---
const html = `<div class="flex p-4">`;
let r = scanClassStrings(html);
assert.equal(r.length, 1);
assert.equal(r[0].value, "flex p-4");
assert.equal(html.slice(r[0].start, r[0].end), "flex p-4");

const jsx = `<div className={cn("flex items-center", ok && "gap-2")}>`;
r = scanClassStrings(jsx);
assert.deepEqual(r.map((x) => x.value).sort(), ["flex items-center", "gap-2"]);

const css = `.btn { @apply px-4 py-2; }`;
r = scanClassStrings(css);
assert.equal(r[0].value.trim(), "px-4 py-2");

// --- tokenize offsets ---
const toks = tokenize("flex  p-4");
assert.deepEqual(toks, [
  { token: "flex", offset: 0 },
  { token: "p-4", offset: 6 },
]);

// --- prefixContext ---
assert.ok(prefixContext(`<div className="`));
assert.ok(prefixContext(`<div class='flex `));
assert.ok(prefixContext(`cn("flex `));
assert.ok(prefixContext(`  @apply px-`));
assert.ok(!prefixContext(`const x = "hello `));
assert.ok(!prefixContext(`<div>flex `));

// --- tokenAt keeps arbitrary values intact ---
const line = `class="bg-[#fff] flex"`;
const at = tokenAt(line, 12); // inside bg-[#fff]
assert.equal(line.slice(at.start, at.end), "bg-[#fff]");

// --- sortValue: unknown first, known by tailwind order ---
assert.equal(sortValue("p-4 flex bg-red-500", ds), "flex bg-red-500 p-4");
assert.equal(sortValue("flex my-custom p-4", ds), "my-custom flex p-4");
assert.equal(sortValue("flex", ds), "flex");
assert.equal(sortValue("flex ${x} p-4", ds), "flex ${x} p-4"); // template guarded

// --- conflicts ---
const names = (v) => conflicts(v, ds).map((c) => `${c.token}>${c.overriddenBy}`);
assert.deepEqual(names("flex grid"), ["flex>grid"]);
assert.deepEqual(names("px-2 px-4"), ["px-2>px-4"]);
assert.deepEqual(names("bg-red-500 bg-blue-500"), ["bg-red-500>bg-blue-500"]);
assert.deepEqual(names("text-red-500 text-lg"), []); // color vs font-size: no conflict
assert.deepEqual(names("md:flex flex"), []); // different variant scope
assert.deepEqual(names("flex my-custom grid"), ["flex>grid"]); // unknown ignored

// --- resolveColorString ---
const vars = parseRootVars(readFileSync(join(root, "src/App.css"), "utf8"));
const colorOf = (cls) =>
  resolveColorString(ds.candidatesToCss([cls])[0] ?? "", ds, vars);
assert.match(colorOf("bg-red-500"), /oklch/); // default palette theme token
assert.equal(colorOf("bg-[#123456]"), "#123456"); // arbitrary literal
assert.match(colorOf("bg-primary"), /oklch/); // shadcn :root var, resolved via parseRootVars
assert.equal(colorOf("flex"), null); // no color

// --- unknown utility detection (drives @apply lint) ---
assert.equal(ds.candidatesToCss(["not-a-real-class"])[0], null);
assert.notEqual(ds.candidatesToCss(["bg-primary"])[0], null); // custom color known

console.log("tailwind: all assertions passed");
