import * as monaco from "monaco-editor";
import { toast } from "sonner";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import { useAiSettings } from "@/lib/ai-settings";

const AI_FIX = "l8ide.aiQuickFix";

type FixPayload = {
  uri: string;
  line: number;
  messages: string[];
};

function stripFences(text: string): string {
  const m = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(text.trim());
  return (m ? m[1] : text).replace(/\s+$/, "");
}

async function applyFix(payload: FixPayload) {
  const { apiKey, model } = useAiSettings.getState();
  if (!apiKey) {
    toast.error("Kein OpenRouter-API-Key hinterlegt. Einstellungen → KI.");
    return;
  }
  const textModel = monaco.editor.getModel(monaco.Uri.parse(payload.uri));
  if (!textModel) return;
  const total = textModel.getLineCount();
  const from = Math.max(1, payload.line - 8);
  const to = Math.min(total, payload.line + 8);
  const context = textModel.getValueInRange(
    new monaco.Range(from, 1, to, textModel.getLineMaxColumn(to)),
  );
  const target = textModel.getLineContent(payload.line);

  const llm = createOpenRouterLlm({ apiKey, model });
  const busy = toast.loading("KI behebt den Fehler…");
  try {
    const result = await llm(
      [
        {
          role: "system",
          content:
            "Du behebst einen einzelnen Fehler in einer Codezeile. Antworte NUR mit der korrigierten Fassung genau dieser einen Zeile — keine Erklärung, keine Markdown-Zäune, keine Nachbarzeilen.",
        },
        {
          role: "user",
          content: `Sprache: ${textModel.getLanguageId()}\nKontext:\n${context}\n\nFehler in der markierten Zeile: ${payload.messages.join("; ")}\n\nZu korrigierende Zeile:\n${target}`,
        },
      ],
    );
    const fixed = stripFences(result.content ?? "");
    toast.dismiss(busy);
    if (!fixed || fixed === target) {
      toast.info("Keine Änderung vorgeschlagen.");
      return;
    }
    const editor = monaco.editor
      .getEditors()
      .find((e) => e.getModel()?.uri.toString() === payload.uri);
    const range = new monaco.Range(
      payload.line,
      1,
      payload.line,
      textModel.getLineMaxColumn(payload.line),
    );
    if (editor) {
      editor.executeEdits("ai-quickfix", [{ range, text: fixed }]);
    } else {
      textModel.pushEditOperations([], [{ range, text: fixed }], () => null);
    }
    toast.success("Fix angewendet (⌘Z macht ihn rückgängig)");
  } catch (e) {
    toast.dismiss(busy);
    toast.error(e instanceof Error ? e.message : String(e));
  }
}

let registered = false;

export function registerAiQuickFix() {
  if (registered) return;
  registered = true;

  monaco.editor.registerCommand(AI_FIX, (_accessor, payload: FixPayload) => {
    void applyFix(payload);
  });

  monaco.languages.registerCodeActionProvider(["typescript", "javascript", "typescriptreact", "javascriptreact", "css", "json"], {
    provideCodeActions(model, _range, context) {
      const markers = context.markers.filter(
        (m) => m.severity >= monaco.MarkerSeverity.Warning,
      );
      if (markers.length === 0) return { actions: [], dispose() {} };
      const line = markers[0].startLineNumber;
      return {
        actions: [
          {
            title: "✨ KI: Fehler beheben",
            kind: "quickfix",
            diagnostics: markers,
            command: {
              id: AI_FIX,
              title: "KI-Fix",
              arguments: [
                {
                  uri: model.uri.toString(),
                  line,
                  messages: markers.slice(0, 3).map((m) => m.message),
                } satisfies FixPayload,
              ],
            },
          },
        ],
        dispose() {},
      };
    },
  });
}
