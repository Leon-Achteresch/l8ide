import assert from "node:assert/strict";
import { createOpenRouterLlm } from "../src/lib/ai/openrouter.ts";

const originalFetch = globalThis.fetch;
let request;

try {
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "feat: keep BYOK commits" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const llm = createOpenRouterLlm({ apiKey: "test-user-key", model: "test-model" });
  const messages = [
    { role: "system", content: "Generate a commit message" },
    { role: "user", content: "diff --git a/file b/file" },
  ];
  assert.deepEqual(await llm(messages), { content: "feat: keep BYOK commits" });
  assert.equal(request.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer test-user-key");
  assert.deepEqual(JSON.parse(request.options.body), {
    model: "test-model",
    messages,
    stream: false,
  });
} finally {
  globalThis.fetch = originalFetch;
}

console.log("openrouter BYOK: OK");
