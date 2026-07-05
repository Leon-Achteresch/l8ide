import assert from "node:assert/strict";
import { applyDiff, DiffError } from "../src/lib/ai/edit-engine.ts";

const B = (s, r) =>
  `------- SEARCH\n${s === "" ? "" : s + "\n"}=======\n${r === "" ? "" : r + "\n"}+++++++ REPLACE`;

// exakter Ersatz
assert.equal(
  applyDiff("const a = 1\nconst b = 2\n", B("const a = 1", "const a = 42")),
  "const a = 42\nconst b = 2\n",
);

// line-trimmed Fallback: Einrückung im SEARCH weicht ab
assert.equal(
  applyDiff("function f() {\n    return 1\n}\n", B("  return 1", "  return 2")),
  "function f() {\n    return 2\n}\n",
);

// block-anchor Fallback: Mittelzeile abweichend, Anker (erste/letzte) gleich
assert.equal(
  applyDiff("a\nfoo(\n  xyz,\n)\nb\n", B("foo(\n  DIFFERENT,\n)", "foo(bar)")),
  "a\nfoo(bar)\nb\n",
);

// neue Datei: leerer SEARCH auf leerer Datei
assert.equal(applyDiff("", B("", "hello\nworld")), "hello\nworld\n");

// mehrere Blöcke, out-of-order -> nach Position sortiert
assert.equal(
  applyDiff("x = 1\ny = 2\nz = 3\n", B("z = 3", "z = 30") + "\n" + B("x = 1", "x = 10")),
  "x = 10\ny = 2\nz = 30\n",
);

// legacy-Marker <<<<<<< / >>>>>>>
assert.equal(
  applyDiff(
    "const a = 1\n",
    "<<<<<<< SEARCH\nconst a = 1\n=======\nconst a = 2\n>>>>>>> REPLACE",
  ),
  "const a = 2\n",
);

// Zeile löschen über echt-leeren REPLACE
assert.equal(
  applyDiff("keep\nremove me\nkeep2\n", B("remove me", "")),
  "keep\nkeep2\n",
);

// kein Match -> DiffError mit Hinweis
assert.throws(
  () => applyDiff("const a = 1\nconst b = 2\n", B("const zzz = 9", "x")),
  (e) => e instanceof DiffError && /nicht in der Datei gefunden/.test(e.message),
);

// leerer SEARCH auf nicht-leerer Datei -> Fehler (Schutz vor Marker-Fehlern)
assert.throws(() => applyDiff("stuff\n", B("", "x")), DiffError);

// gar kein Block -> Fehler
assert.throws(() => applyDiff("stuff\n", "kein marker text"), DiffError);

// exakter Match bevorzugt gegenüber erstem fuzzy-Kandidaten
assert.equal(
  applyDiff("val = 1\n  val = 1\n", B("val = 1", "val = 2")),
  "val = 2\n  val = 1\n",
);

console.log("edit-engine: all assertions passed");
