import { executeTool, type ToolDef, type WorkspaceFs } from "./tools.ts";

export type ToolCall = {
  id: string;
  type?: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type AssistantResult = { content: string; tool_calls?: ToolCall[] };

// Ein LLM-Aufruf für eine Runde. Real: OpenRouter-Stream, zusammengefasst zu einer
// Assistant-Nachricht. In Tests: gescriptete Antworten.
export type Llm = (
  messages: ChatMessage[],
  tools: ToolDef[],
) => Promise<AssistantResult>;

export type AgentEvent =
  | { type: "assistant"; content: string }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | { type: "tool_result"; id: string; name: string; result: string }
  | { type: "done"; rounds: number }
  | { type: "error"; message: string };

export type RunAgentOptions = {
  messages: ChatMessage[];
  tools: ToolDef[];
  fs: WorkspaceFs;
  llm: Llm;
  onEvent?: (e: AgentEvent) => void;
  maxRounds?: number;
  signal?: AbortSignal;
};

function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

/**
 * Agent-Schleife: LLM aufrufen, Tool-Calls ausführen, Ergebnisse zurückspeisen,
 * bis das Modell ohne Tool-Call antwortet oder maxRounds erreicht ist.
 * Gibt die vollständige Nachrichtenliste zurück.
 */
export async function runAgent({
  messages,
  tools,
  fs,
  llm,
  onEvent,
  maxRounds = 12,
  signal,
}: RunAgentOptions): Promise<ChatMessage[]> {
  const history = [...messages];

  for (let round = 1; round <= maxRounds; round++) {
    if (signal?.aborted) {
      onEvent?.({ type: "error", message: "Abgebrochen." });
      return history;
    }

    let result: AssistantResult;
    try {
      result = await llm(history, tools);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      onEvent?.({ type: "error", message });
      return history;
    }

    const calls = result.tool_calls ?? [];
    history.push({
      role: "assistant",
      content: result.content ?? "",
      ...(calls.length ? { tool_calls: calls } : {}),
    });

    if (calls.length === 0) {
      onEvent?.({ type: "assistant", content: result.content ?? "" });
      onEvent?.({ type: "done", rounds: round });
      return history;
    }

    if (result.content) onEvent?.({ type: "assistant", content: result.content });

    for (const call of calls) {
      const args = parseArgs(call.function.arguments);
      onEvent?.({ type: "tool_call", id: call.id, name: call.function.name, args });
      const output = await executeTool(call.function.name, args, fs);
      onEvent?.({
        type: "tool_result",
        id: call.id,
        name: call.function.name,
        result: output,
      });
      history.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }

  onEvent?.({ type: "error", message: `Maximale Rundenzahl (${maxRounds}) erreicht.` });
  return history;
}
