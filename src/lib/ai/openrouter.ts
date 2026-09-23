const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

type Message = { role: "system" | "user" | "assistant"; content: string };

export type OpenRouterOptions = {
  apiKey: string;
  model: string;
  signal?: AbortSignal;
};

/** Sends a single prompt for editor and Git AI actions. */
export function createOpenRouterLlm(opts: OpenRouterOptions) {
  return async (messages: Message[]): Promise<{ content: string }> => {
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
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `OpenRouter ${res.status}: ${text.slice(0, 200) || res.statusText}`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return { content: data.choices?.[0]?.message?.content ?? "" };
  };
}
