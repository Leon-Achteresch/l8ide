import { getMonacoInstance } from "@/lib/monaco-instance";
import {
  encodeSemanticTokens,
  SEMANTIC_TOKEN_MODIFIERS,
  SEMANTIC_TOKEN_TYPES,
} from "@/lib/semantic-encode";
import { typescript as tsLanguages } from "monaco-editor";

const LANGS = ["typescript", "javascript"];

const LEGEND = {
  tokenTypes: SEMANTIC_TOKEN_TYPES,
  tokenModifiers: SEMANTIC_TOKEN_MODIFIERS,
};

type SemanticWorker = {
  getEncodedSemanticClassifications(
    fileName: string,
    span: { start: number; length: number },
    format?: string,
  ): Promise<{ spans: number[]; endOfLineState: number } | undefined>;
};

let registered = false;

export function registerSemanticTokens() {
  const m = getMonacoInstance();
  if (!m || registered) return;
  registered = true;

  m.languages.registerDocumentSemanticTokensProvider(LANGS, {
    getLegend: () => LEGEND,
    provideDocumentSemanticTokens: async (model) => {
      try {
        const getWorker =
          model.getLanguageId() === "javascript"
            ? tsLanguages.getJavaScriptWorker
            : tsLanguages.getTypeScriptWorker;
        const accessor = await getWorker();
        const worker = (await accessor(model.uri)) as unknown as SemanticWorker;
        const res = await worker.getEncodedSemanticClassifications(
          model.uri.toString(),
          { start: 0, length: model.getValueLength() },
          "2020",
        );
        if (!res?.spans?.length) return { data: new Uint32Array(0) };
        return {
          data: Uint32Array.from(
            encodeSemanticTokens(res.spans, (offset) =>
              model.getPositionAt(offset),
            ),
          ),
        };
      } catch {
        return { data: new Uint32Array(0) };
      }
    },
    releaseDocumentSemanticTokens: () => {},
  });
}
