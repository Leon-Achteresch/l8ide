import { toast } from "sonner";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import { useAiSettings } from "@/lib/ai-settings";
import { getMonacoInstance } from "@/lib/monaco-instance";

function focusedContext(): { language: string; context: string } | null {
  const m = getMonacoInstance();
  const editor = m?.editor.getEditors().find((e) => e.hasTextFocus());
  const model = editor?.getModel();
  const pos = editor?.getPosition();
  if (!m || !model || !pos) return null;
  const from = Math.max(1, pos.lineNumber - 12);
  const to = Math.min(model.getLineCount(), pos.lineNumber + 12);
  return {
    language: model.getLanguageId(),
    context: model.getValueInRange(
      new m.Range(from, 1, to, model.getLineMaxColumn(to)),
    ),
  };
}

export async function suggestRename(oldName: string): Promise<string | null> {
  const { apiKey, model } = useAiSettings.getState();
  if (!apiKey) {
    toast.error("Kein OpenRouter-API-Key hinterlegt. Einstellungen → KI.");
    return null;
  }
  const ctx = focusedContext();
  const llm = createOpenRouterLlm({ apiKey, model });
  const result = await llm(
    [
      {
        role: "system",
        content:
          "Du schlägst einen besseren, sprechenden Bezeichner vor. Antworte NUR mit dem neuen Namen (gültiger Identifier, gleiche Namenskonvention wie im Code) — kein Text, keine Anführungszeichen, keine Erklärung.",
      },
      {
        role: "user",
        content: `Sprache: ${ctx?.language ?? "?"}\nKontext:\n${ctx?.context ?? ""}\n\nBesserer Name für „${oldName}“:`,
      },
    ],
  ).catch((e) => {
    toast.error(e instanceof Error ? e.message : String(e));
    return null;
  });
  if (!result) return null;
  const name = (result.content ?? "")
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .split(/\s/)[0];
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : null;
}
