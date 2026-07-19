import type * as monacoNs from "monaco-editor";
import { useAiSettings } from "@/lib/ai-settings";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEBOUNCE_MS = 350;
const MAX_TOKENS = 128;

let lastKey = "";
let lastText = "";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripFences(text: string): string {
  const trimmed = text.replace(/^```[\w-]*\n?/, "").replace(/\n?```\s*$/, "");
  return trimmed.replace(/\s+$/, "");
}

async function requestCompletion(
  before: string,
  after: string,
  token: monacoNs.CancellationToken,
): Promise<string> {
  const { apiKey, model } = useAiSettings.getState();
  const controller = new AbortController();
  const sub = token.onCancellationRequested(() => controller.abort());
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://l8ide.local",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Du bist eine Code-Vervollständigung. Der User-Inhalt zeigt Code vor und nach der Marke <CURSOR>. Antworte NUR mit dem Text, der an der Marke eingefügt werden soll — keine Erklärungen, keine Markdown-Zäune, keine Wiederholung des vorhandenen Codes. Maximal wenige Zeilen.",
          },
          { role: "user", content: `${before}<CURSOR>${after}` },
        ],
      }),
    });
    if (!res.ok) return "";
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return stripFences(json.choices?.[0]?.message?.content ?? "");
  } catch {
    return "";
  } finally {
    sub.dispose();
  }
}

export function registerAiInlineCompletions(monaco: typeof monacoNs) {
  monaco.languages.registerInlineCompletionsProvider("*", {
    async provideInlineCompletions(model, position, _context, token) {
      const { apiKey, inlineCompletions } = useAiSettings.getState();
      if (!inlineCompletions || !apiKey) return { items: [] };

      await sleep(DEBOUNCE_MS);
      if (token.isCancellationRequested) return { items: [] };

      const startLine = Math.max(1, position.lineNumber - 60);
      const endLine = Math.min(model.getLineCount(), position.lineNumber + 15);
      const before = model.getValueInRange(
        new monaco.Range(startLine, 1, position.lineNumber, position.column),
      );
      const after = model.getValueInRange(
        new monaco.Range(
          position.lineNumber,
          position.column,
          endLine,
          model.getLineMaxColumn(endLine),
        ),
      );
      if (before.trim().length < 3) return { items: [] };

      const key = `${model.uri.toString()}:${before.slice(-400)}`;
      const text =
        key === lastKey && lastText
          ? lastText
          : await requestCompletion(before, after, token);
      if (!text || token.isCancellationRequested) return { items: [] };
      lastKey = key;
      lastText = text;

      return {
        items: [
          {
            insertText: text,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
          },
        ],
      };
    },
    disposeInlineCompletions() {},
  });
}
