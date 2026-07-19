import assert from "node:assert/strict";
import { pruneForLlm } from "../src/lib/ai/agent.ts";

const tool = (id, content) => ({ role: "tool", tool_call_id: id, content });
const asst = (content) => ({ role: "assistant", content });

const history = [
  { role: "system", content: "sys" },
  { role: "user", content: "frage" },
];
for (let i = 0; i < 8; i++) {
  history.push(asst(`runde ${i}`));
  history.push(tool(`t${i}`, `output ${i} `.repeat(10)));
}
history.push(tool("big", "x".repeat(20000)));

const pruned = pruneForLlm(history);

assert.equal(pruned.length, history.length);
assert.equal(pruned[0].content, "sys");
assert.equal(pruned[1].content, "frage");

const toolMsgs = pruned.filter((m) => m.role === "tool");
assert.equal(toolMsgs.length, 9);
const stubbed = toolMsgs.filter((m) => m.content.startsWith("[Alte Tool-Ausgabe entfernt"));
assert.equal(stubbed.length, 3);
assert.ok(toolMsgs[0].content.startsWith("[Alte Tool-Ausgabe entfernt"));
assert.ok(toolMsgs[3].content.startsWith("output 3"));

const big = toolMsgs[toolMsgs.length - 1];
assert.ok(big.content.length < 20000);
assert.ok(big.content.includes("[gekürzt, 20000 Zeichen gesamt]"));

assert.ok(history[history.length - 1].content.length === 20000);

const short = pruneForLlm([
  { role: "user", content: "u" },
  tool("a", "klein"),
]);
assert.equal(short[1].content, "klein");

console.log("test-ai-prune: ok");
