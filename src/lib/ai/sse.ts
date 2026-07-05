// Purer inkrementeller SSE-Parser für OpenRouter-Streaming. Zerlegt einen wachsenden
// Puffer in vollständige "data:"-Events und gibt den unvollständigen Rest zurück.

export type SseParse = { events: unknown[]; rest: string; done: boolean };

export function parseSseBuffer(buffer: string): SseParse {
  const events: unknown[] = [];
  let done = false;
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    for (const rawLine of part.split("\n")) {
      const line = rawLine.trimStart();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        done = true;
        continue;
      }
      if (!data) continue;
      try {
        events.push(JSON.parse(data));
      } catch {
        // unvollständiges JSON: sollte durch \n\n-Split nicht vorkommen; ignorieren
      }
    }
  }
  return { events, rest, done };
}

export type Delta = {
  content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
};

export function deltaFromEvent(ev: unknown): Delta | null {
  const choice = (ev as { choices?: Array<{ delta?: Delta }> })?.choices?.[0];
  return choice?.delta ?? null;
}

export type AccumulatedToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

/**
 * Fügt einen Streaming-Delta in den akkumulierten Zustand ein. Tool-Calls kommen
 * fragmentiert (pro `index`), die Argument-Strings werden zusammengesetzt.
 */
export function accumulateDelta(
  acc: { content: string; toolCalls: AccumulatedToolCall[] },
  delta: Delta,
): void {
  if (delta.content) acc.content += delta.content;
  for (const tc of delta.tool_calls ?? []) {
    const i = tc.index;
    acc.toolCalls[i] ??= { id: "", function: { name: "", arguments: "" } };
    if (tc.id) acc.toolCalls[i].id = tc.id;
    if (tc.function?.name) acc.toolCalls[i].function.name += tc.function.name;
    if (tc.function?.arguments)
      acc.toolCalls[i].function.arguments += tc.function.arguments;
  }
}
