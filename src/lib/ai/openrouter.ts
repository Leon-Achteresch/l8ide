import type { AssistantResult, ChatMessage, Llm } from "./agent.ts";
import type { ToolDef } from "./tools.ts";
import {
  accumulateDelta,
  deltaFromEvent,
  parseSseBuffer,
  type AccumulatedToolCall,
} from "./sse.ts";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type OpenRouterOptions = {
  apiKey: string;
  model: string;
  signal?: AbortSignal;
  onContentDelta?: (chunk: string) => void;
};

function toToolCalls(acc: AccumulatedToolCall[]) {
  return acc
    .filter((t) => t && t.function.name)
    .map((t, i) => ({
      id: t.id || `call_${i}`,
      type: "function" as const,
      function: t.function,
    }));
}

/** Erzeugt eine `Llm`-Funktion, die eine Runde gegen OpenRouter streamt. */
export function createOpenRouterLlm(opts: OpenRouterOptions): Llm {
  return async (messages: ChatMessage[], tools: ToolDef[]): Promise<AssistantResult> => {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: opts.signal,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://l8ide.local",
        "X-Title": "l8ide",
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        tools,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `OpenRouter ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const acc = { content: "", toolCalls: [] as AccumulatedToolCall[] };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.rest;
      for (const ev of parsed.events) {
        const delta = deltaFromEvent(ev);
        if (!delta) continue;
        accumulateDelta(acc, delta);
        if (delta.content) opts.onContentDelta?.(delta.content);
      }
      if (parsed.done) break;
    }

    const toolCalls = toToolCalls(acc.toolCalls);
    return {
      content: acc.content,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    };
  };
}
