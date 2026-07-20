import assert from "node:assert/strict";
import { buildModuleGraph, moduleOf } from "../src/lib/project-graph-core.ts";

assert.equal(moduleOf("src/lib/foo.ts"), "src/lib");
assert.equal(moduleOf("src/components/chat/panel.tsx"), "src/components");
assert.equal(moduleOf("index.html"), "(root)");
assert.equal(moduleOf("scripts/test.mjs"), "scripts");

const root = "/repo";
const sources = [
  { path: "/repo/src/lib/store.ts", content: "export const x = 1;" },
  { path: "/repo/src/lib/util.ts", content: 'import { x } from "./store";' },
  {
    path: "/repo/src/components/panel.tsx",
    content: 'import { x } from "@/lib/store";\nimport { y } from "../lib/util";',
  },
  { path: "/repo/src/components/row.tsx", content: 'import { x } from "@/lib/store";' },
];
const { nodes, edges } = buildModuleGraph(sources, root, { "@": "src" });

assert.deepEqual(
  nodes.map((n) => `${n.id}:${n.files}`).sort(),
  ["src/components:2", "src/lib:2"],
);
assert.equal(edges.length, 1);
assert.deepEqual(edges[0], { from: "src/components", to: "src/lib", count: 3 });

console.log("test-project-graph: ok");
