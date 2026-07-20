import * as monaco from "monaco-editor";
import type ts from "typescript";
import { getRefactorWorker, isRefactorLanguage } from "@/lib/ts-refactor";

const KIND_MAP: Record<string, monaco.languages.CompletionItemKind> = {
  function: monaco.languages.CompletionItemKind.Function,
  const: monaco.languages.CompletionItemKind.Constant,
  let: monaco.languages.CompletionItemKind.Variable,
  var: monaco.languages.CompletionItemKind.Variable,
  class: monaco.languages.CompletionItemKind.Class,
  interface: monaco.languages.CompletionItemKind.Interface,
  type: monaco.languages.CompletionItemKind.TypeParameter,
  enum: monaco.languages.CompletionItemKind.Enum,
  module: monaco.languages.CompletionItemKind.Module,
  method: monaco.languages.CompletionItemKind.Method,
};

type Stash = {
  model: monaco.editor.ITextModel;
  offset: number;
  name: string;
  source: string;
  data?: ts.CompletionEntryData;
};

const stashes = new WeakMap<object, Stash>();

function shortenSource(source: string): string {
  const i = source.lastIndexOf("/src/");
  return i >= 0 ? source.slice(i + 1) : source;
}

export function registerAutoImports() {
  monaco.languages.registerCompletionItemProvider(
    ["typescript", "javascript"],
    {
      async provideCompletionItems(model, position) {
        if (!isRefactorLanguage(model.getLanguageId()))
          return { suggestions: [] };
        const word = model.getWordUntilPosition(position);
        if (word.word.length < 2) return { suggestions: [] };
        const worker = await getRefactorWorker(model);
        if (!worker?.getImportCompletions) return { suggestions: [] };
        const offset = model.getOffsetAt(position);
        const entries = await worker
          .getImportCompletions(model.uri.toString(), offset)
          .catch(() => []);
        if (model.isDisposed() || entries.length === 0)
          return { suggestions: [] };
        const range = new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn,
        );
        return {
          suggestions: entries.map((e) => {
            const item: monaco.languages.CompletionItem = {
              label: { label: e.name, description: shortenSource(e.source) },
              kind:
                KIND_MAP[e.kind] ?? monaco.languages.CompletionItemKind.Value,
              detail: `Auto-Import aus ${shortenSource(e.source)}`,
              insertText: e.name,
              range,
              sortText: `￿${e.name}`,
            };
            stashes.set(item, {
              model,
              offset,
              name: e.name,
              source: e.source,
              data: e.data,
            });
            return item;
          }),
        };
      },
      async resolveCompletionItem(item) {
        const stash = stashes.get(item);
        if (!stash || stash.model.isDisposed()) return item;
        const worker = await getRefactorWorker(stash.model);
        if (!worker?.getImportCompletionDetails) return item;
        const details = await worker
          .getImportCompletionDetails(
            stash.model.uri.toString(),
            stash.offset,
            stash.name,
            stash.source,
            stash.data,
          )
          .catch(() => undefined);
        if (!details || stash.model.isDisposed()) return item;
        const fileName = stash.model.uri.toString();
        const edits = (details.codeActions ?? [])
          .flatMap((a) => a.changes)
          .filter((c) => c.fileName === fileName)
          .flatMap((c) => c.textChanges)
          .map((tc) => {
            const start = stash.model.getPositionAt(tc.span.start);
            const end = stash.model.getPositionAt(
              tc.span.start + tc.span.length,
            );
            return {
              range: new monaco.Range(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column,
              ),
              text: tc.newText,
            };
          });
        if (edits.length > 0) item.additionalTextEdits = edits;
        return item;
      },
    },
  );
}
