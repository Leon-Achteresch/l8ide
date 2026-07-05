import assert from "node:assert/strict";
import { runAgent } from "../src/lib/ai/agent.ts";
import { TOOLS } from "../src/lib/ai/tools.ts";

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
    async search() {
      return "Keine Treffer.";
    },
  };
}

const call = (id, name, args) => ({
  id,
  type: "function",
  function: { name, arguments: JSON.stringify(args) },
});

// Gescriptetes LLM: read_file -> edit_file -> Abschlussantwort.
// Testet die volle Schleife (Tool ausführen, Ergebnis zurückspeisen, terminieren).
function scriptedLlm(steps) {
  let i = 0;
  return async () => steps[i++];
}

const fs = mockFs({ "src/mathx.js": "export const inc = (n) => n + 2\n" });

const events = [];
const llm = scriptedLlm([
  { content: "", tool_calls: [call("c1", "read_file", { path: "src/mathx.js" })] },
  {
    content: "",
    tool_calls: [
      call("c2", "edit_file", {
        path: "src/mathx.js",
        diff: "------- SEARCH\nexport const inc = (n) => n + 2\n=======\nexport const inc = (n) => n + 1\n+++++++ REPLACE",
      }),
    ],
  },
  { content: "Habe den Off-by-one-Fehler in inc korrigiert." },
]);

const history = await runAgent({
  messages: [
    { role: "system", content: "sys" },
    { role: "user", content: "inc soll um 1 erhöhen, nicht um 2." },
  ],
  tools: TOOLS,
  fs,
  llm,
  onEvent: (e) => events.push(e),
});

// Datei wurde tatsächlich korrekt geändert
assert.equal(fs.files["src/mathx.js"], "export const inc = (n) => n + 1\n");

// Tool-Ergebnisse landen als role:tool in der History
const toolMsgs = history.filter((m) => m.role === "tool");
assert.equal(toolMsgs.length, 2);
assert.match(toolMsgs[0].content, /export const inc/); // read-Ergebnis
assert.match(toolMsgs[1].content, /^OK/); // edit-Ergebnis

// Event-Reihenfolge: tool_call/tool_result Paare + finales assistant + done
const types = events.map((e) => e.type);
assert.deepEqual(types, [
  "tool_call",
  "tool_result",
  "tool_call",
  "tool_result",
  "assistant",
  "done",
]);
assert.equal(events.at(-2).content, "Habe den Off-by-one-Fehler in inc korrigiert.");
assert.equal(events.at(-1).rounds, 3);

// Abbruch via Signal: keine Runde läuft
const aborted = new AbortController();
aborted.abort();
const abortEvents = [];
await runAgent({
  messages: [{ role: "user", content: "x" }],
  tools: TOOLS,
  fs: mockFs(),
  llm: scriptedLlm([{ content: "sollte nie laufen" }]),
  signal: aborted.signal,
  onEvent: (e) => abortEvents.push(e),
});
assert.equal(abortEvents[0].type, "error");

// maxRounds-Schutz: LLM ruft endlos Tools -> terminiert mit Fehler
const loopEvents = [];
await runAgent({
  messages: [{ role: "user", content: "x" }],
  tools: TOOLS,
  fs: mockFs({ "a.txt": "hi\n" }),
  llm: async () => ({
    content: "",
    tool_calls: [call("loop", "read_file", { path: "a.txt" })],
  }),
  maxRounds: 3,
  onEvent: (e) => loopEvents.push(e),
});
assert.equal(loopEvents.at(-1).type, "error");
assert.match(loopEvents.at(-1).message, /Maximale Rundenzahl/);

console.log("ai-agent: all assertions passed");
