import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import type { ChatMessage } from "@/lib/ai/agent";
import { useAiSettings } from "@/lib/ai-settings";
import { languageOf } from "@/lib/language-of";

function stripFences(text: string): string {
  const trimmed = text.trim();
  const m = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return m ? m[1] : trimmed;
}

export function attachInlineChat(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  let widget: monacoNs.editor.IContentWidget | null = null;
  let abort: AbortController | null = null;

  function close() {
    abort?.abort();
    abort = null;
    if (widget) {
      editor.removeContentWidget(widget);
      widget = null;
    }
    editor.focus();
  }

  async function submit(
    instruction: string,
    anchor: monacoNs.Position,
    setBusy: (busy: boolean) => void,
  ) {
    const { apiKey, model } = useAiSettings.getState();
    if (!apiKey) {
      toast.error("Kein OpenRouter-API-Key hinterlegt. Einstellungen → KI.");
      return;
    }
    const textModel = editor.getModel();
    if (!textModel) return;
    const sel = editor.getSelection();
    const hasSel = Boolean(sel && !sel.isEmpty());
    const selText = hasSel && sel ? textModel.getValueInRange(sel) : "";
    const focusLine = hasSel && sel ? sel.startLineNumber : anchor.lineNumber;
    const endLine = hasSel && sel ? sel.endLineNumber : anchor.lineNumber;
    const ctxStart = Math.max(1, focusLine - 30);
    const ctxEnd = Math.min(textModel.getLineCount(), endLine + 30);
    const context = textModel.getValueInRange(
      new monaco.Range(ctxStart, 1, ctxEnd, textModel.getLineMaxColumn(ctxEnd)),
    );

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Du bist ein präziser Code-Assistent in einem Editor. Antworte ausschließlich mit dem fertigen Code — keine Erklärungen, keine Markdown-Zäune.",
      },
      {
        role: "user",
        content:
          `Datei (${languageOf(absPath)}), Kontextausschnitt:\n${context}\n\n` +
          (hasSel
            ? `Markierter Code, der ersetzt werden soll:\n${selText}\n\n`
            : "Es ist nichts markiert. Erzeuge Code, der an der Cursorposition eingefügt wird.\n\n") +
          `Anweisung: ${instruction}`,
      },
    ];

    abort = new AbortController();
    setBusy(true);
    const llm = createOpenRouterLlm({ apiKey, model, signal: abort.signal });
    try {
      const result = await llm(messages, []);
      const code = stripFences(result.content ?? "");
      if (!code) {
        toast.info("Leere Antwort vom Modell.");
        return;
      }
      const range =
        hasSel && sel
          ? sel
          : new monaco.Range(
              anchor.lineNumber,
              anchor.column,
              anchor.lineNumber,
              anchor.column,
            );
      editor.executeEdits("inline-chat", [{ range, text: code }]);
      close();
    } catch (e) {
      if (!abort?.signal.aborted)
        toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function open() {
    if (widget) return;
    const anchor = editor.getPosition();
    if (!anchor) return;

    const node = document.createElement("div");
    node.className =
      "flex w-[min(480px,50vw)] items-center gap-2 rounded-xl bg-popover px-3 py-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur-xl";
    const input = document.createElement("input");
    input.placeholder = "KI-Anweisung… (⏎ senden · Esc schließen)";
    input.className =
      "min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground";
    const status = document.createElement("span");
    status.className = "hidden shrink-0 text-[10px] text-muted-foreground";
    status.textContent = "Denkt…";
    node.append(input, status);

    const setBusy = (busy: boolean) => {
      input.disabled = busy;
      status.classList.toggle("hidden", !busy);
      node.classList.toggle("opacity-80", busy);
    };

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") close();
      if (e.key === "Enter" && input.value.trim() && !input.disabled) {
        void submit(input.value.trim(), anchor, setBusy);
      }
    });

    widget = {
      getId: () => "l8ide-inline-chat",
      getDomNode: () => node,
      allowEditorOverflow: true,
      getPosition: () => ({
        position: { lineNumber: anchor.lineNumber, column: 1 },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW,
        ],
      }),
    };
    editor.addContentWidget(widget);
    requestAnimationFrame(() => input.focus());
  }

  editor.addAction({
    id: "l8ide.inline-chat",
    label: "Inline-Chat (KI)",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI],
    contextMenuGroupId: "1_modification",
    run: open,
  });
  editor.onDidDispose(close);
}
