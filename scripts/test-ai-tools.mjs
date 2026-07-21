import assert from "node:assert/strict";
import { TOOLS, executeTool } from "../src/lib/ai/tools.ts";

function mockFs(initial = {}) {
  const files = { ...initial };
  return {
    files,
    async list() {
      return Object.keys(files);
    },
    async read(p) {
      return files[p];
    },
    async write(p, c) {
      files[p] = c;
    },
    async exists(p) {
      return p in files;
    },
    async search(q) {
      const hits = [];
      for (const [p, c] of Object.entries(files))
        c.split("\n").forEach((l, i) => {
          if (l.includes(q)) hits.push(`${p}:${i + 1}: ${l.trim()}`);
        });
      return hits.length ? hits.join("\n") : "Keine Treffer.";
    },
  };
}

// Toolset ist klein und aufgabenscharf (Bench: klein schlägt groß)
assert.equal(TOOLS.length, 6, "erwarte genau 6 Tools");
assert.deepEqual(
  TOOLS.map((t) => t.function.name).sort(),
  ["create_file", "edit_file", "list_files", "read_file", "run_command", "search"],
);
for (const t of TOOLS) {
  assert.equal(t.type, "function");
  assert.ok(t.function.description.length > 0);
  assert.equal(t.function.parameters.type, "object");
}

const fs = mockFs({ "src/a.js": "export const x = 1\n" });

// list
assert.equal(await executeTool("list_files", {}, fs), "src/a.js");

// read
assert.equal(await executeTool("read_file", { path: "src/a.js" }, fs), "export const x = 1\n");

// read fehlende Datei -> Fehlertext (kein throw)
assert.match(await executeTool("read_file", { path: "nope.js" }, fs), /nicht gefunden/);

// edit_file wendet SEARCH/REPLACE an und schreibt zurück
const okMsg = await executeTool(
  "edit_file",
  {
    path: "src/a.js",
    diff: "------- SEARCH\nexport const x = 1\n=======\nexport const x = 2\n+++++++ REPLACE",
  },
  fs,
);
assert.match(okMsg, /^OK/);
assert.equal(fs.files["src/a.js"], "export const x = 2\n");

// edit_file mit nicht passendem SEARCH -> Fehlertext zurück (Retry-Muster), Datei unverändert
const failMsg = await executeTool(
  "edit_file",
  {
    path: "src/a.js",
    diff: "------- SEARCH\nZZZ nicht da\n=======\nY\n+++++++ REPLACE",
  },
  fs,
);
assert.match(failMsg, /FEHLER beim Anwenden/);
assert.equal(fs.files["src/a.js"], "export const x = 2\n", "Datei bleibt unverändert bei Fehlmatch");

// create_file
assert.match(await executeTool("create_file", { path: "src/b.js", content: "y\n" }, fs), /^OK/);
assert.equal(fs.files["src/b.js"], "y\n");

// search
assert.match(await executeTool("search", { query: "const x" }, fs), /src\/a\.js:1/);

// unbekanntes Tool
assert.match(await executeTool("bogus", {}, fs), /unbekanntes Tool/);

console.log("ai-tools: all assertions passed");
