import type * as monacoNs from "monaco-editor";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createOpenRouterLlm } from "@/lib/ai/openrouter";
import { useAiSettings } from "@/lib/ai-settings";
import { hashPath } from "@/lib/local-history";
import { getOutline } from "@/lib/outline";
import { symbolChainAt } from "@/lib/outline-chain";

const MAX_CACHE = 200;

type ExplainCache = {
  entries: Record<string, string>;
  order: string[];
  put: (key: string, text: string) => void;
};

export const useExplainCache = create<ExplainCache>()(
  persist(
    (set) => ({
      entries: {},
      order: [],
      put: (key, text) =>
        set((s) => {
          const entries = { ...s.entries, [key]: text };
          const order = [...s.order.filter((k) => k !== key), key];
          while (order.length > MAX_CACHE) {
            const drop = order.shift();
            if (drop) delete entries[drop];
          }
          return { entries, order };
        }),
    }),
    { name: "explain-cache" },
  ),
);

async function explainCode(code: string): Promise<string | null> {
  const { apiKey, model } = useAiSettings.getState();
  if (!apiKey) {
    toast.error("Kein OpenRouter-API-Key hinterlegt. Einstellungen → KI.");
    return null;
  }
  const llm = createOpenRouterLlm({ apiKey, model });
  const result = await llm(
    [
      {
        role: "system",
        content:
          "Erkläre den Code kompakt auf Deutsch: Zweck, Ablauf, nicht offensichtliche Details. Maximal 6 Sätze, keine Code-Wiederholung, keine Überschriften.",
      },
      { role: "user", content: code.slice(0, 12000) },
    ],
    [],
  );
  return (result.content ?? "").trim() || null;
}

export function attachExplainLayer(
  editor: monacoNs.editor.IStandaloneCodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  let widget: monacoNs.editor.IContentWidget | null = null;

  function close() {
    if (widget) {
      editor.removeContentWidget(widget);
      widget = null;
    }
  }

  function show(anchorLine: number, initial: string) {
    close();
    const node = document.createElement("div");
    node.className =
      "w-[min(520px,55vw)] overflow-hidden rounded-xl bg-popover shadow-lg ring-1 ring-foreground/10 backdrop-blur-xl";
    const header = document.createElement("div");
    header.className =
      "flex h-7 items-center gap-1.5 bg-foreground/[0.04] px-2.5 text-[11px] font-medium";
    header.textContent = "KI-Erklärung";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.className =
      "ml-auto rounded-md px-1.5 text-muted-foreground hover:bg-foreground/8 hover:text-foreground";
    closeBtn.onclick = close;
    header.append(closeBtn);
    const body = document.createElement("div");
    body.className =
      "max-h-56 overflow-y-auto whitespace-pre-wrap px-2.5 py-2 text-xs leading-relaxed text-foreground/90";
    body.textContent = initial;
    node.append(header, body);
    node.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    widget = {
      getId: () => "l8ide-explain",
      getDomNode: () => node,
      allowEditorOverflow: true,
      getPosition: () => ({
        position: { lineNumber: anchorLine, column: 1 },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
        ],
      }),
    };
    editor.addContentWidget(widget);
    return body;
  }

  editor.addAction({
    id: "l8ide.explain",
    label: "Code erklären (KI)",
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyE,
    ],
    contextMenuGroupId: "1_modification",
    run: async () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      if (!model || !position) return;
      const selection = editor.getSelection();
      let code: string;
      let anchorLine: number;
      if (selection && !selection.isEmpty()) {
        code = model.getValueInRange(selection);
        anchorLine = selection.startLineNumber;
      } else {
        const symbols = await getOutline(absPath).catch(() => []);
        const chain = symbolChainAt(symbols, position.lineNumber);
        const target = chain[chain.length - 1];
        if (!target) {
          toast.info("Keine Funktion an der Cursorposition gefunden.");
          return;
        }
        code = model.getValueInRange(
          new monaco.Range(
            target.line,
            1,
            target.endLine,
            model.getLineMaxColumn(target.endLine),
          ),
        );
        anchorLine = target.line;
      }
      const key = hashPath(code);
      const cached = useExplainCache.getState().entries[key];
      if (cached) {
        show(anchorLine, cached);
        return;
      }
      const body = show(anchorLine, "Denkt…");
      const text = await explainCode(code).catch(() => null);
      if (!widget) return;
      if (text) {
        useExplainCache.getState().put(key, text);
        body.textContent = text;
      } else {
        body.textContent = "Keine Erklärung erhalten.";
      }
    },
  });

  editor.onDidDispose(close);
}
