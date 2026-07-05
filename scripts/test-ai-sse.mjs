import assert from "node:assert/strict";
import {
  parseSseBuffer,
  deltaFromEvent,
  accumulateDelta,
} from "../src/lib/ai/sse.ts";

// Vollständige Events werden geparst, unvollständiger Rest bleibt im Puffer
{
  const chunk =
    'data: {"choices":[{"delta":{"content":"Hal"}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n' +
    'data: {"choices":[{"delta":';
  const { events, rest, done } = parseSseBuffer(chunk);
  assert.equal(events.length, 2);
  assert.equal(done, false);
  assert.match(rest, /^data: \{"choices":\[\{"delta":$/);
  assert.equal(deltaFromEvent(events[0]).content, "Hal");
}

// [DONE]-Sentinel setzt done
{
  const { done } = parseSseBuffer("data: [DONE]\n\n");
  assert.equal(done, true);
}

// Content-Deltas akkumulieren
{
  const acc = { content: "", toolCalls: [] };
  accumulateDelta(acc, { content: "Hal" });
  accumulateDelta(acc, { content: "lo Welt" });
  assert.equal(acc.content, "Hallo Welt");
}

// Fragmentierte Tool-Calls (Argumente über mehrere Deltas) werden zusammengesetzt
{
  const acc = { content: "", toolCalls: [] };
  accumulateDelta(acc, {
    tool_calls: [{ index: 0, id: "c1", function: { name: "edit_file", arguments: '{"pa' } }],
  });
  accumulateDelta(acc, {
    tool_calls: [{ index: 0, function: { arguments: 'th":"a.js"}' } }],
  });
  assert.equal(acc.toolCalls.length, 1);
  assert.equal(acc.toolCalls[0].id, "c1");
  assert.equal(acc.toolCalls[0].function.name, "edit_file");
  assert.deepEqual(JSON.parse(acc.toolCalls[0].function.arguments), { path: "a.js" });
}

// Zwei parallele Tool-Calls nach index getrennt
{
  const acc = { content: "", toolCalls: [] };
  accumulateDelta(acc, {
    tool_calls: [
      { index: 0, id: "a", function: { name: "read_file", arguments: "{}" } },
      { index: 1, id: "b", function: { name: "list_files", arguments: "{}" } },
    ],
  });
  assert.equal(acc.toolCalls.length, 2);
  assert.equal(acc.toolCalls[1].function.name, "list_files");
}

console.log("ai-sse: all assertions passed");
