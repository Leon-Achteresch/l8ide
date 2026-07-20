import * as monaco from "monaco-editor";
import { expressionStart } from "@/lib/postfix-core";
import { isRefactorLanguage } from "@/lib/ts-refactor";

type Template = {
  key: string;
  detail: string;
  build: (expr: string) => string;
};

const TEMPLATES: Template[] = [
  { key: "log", detail: "console.log(expr)", build: (e) => `console.log(${e})$0` },
  { key: "error", detail: "console.error(expr)", build: (e) => `console.error(${e})$0` },
  { key: "if", detail: "if (expr) { … }", build: (e) => `if (${e}) {\n\t$0\n}` },
  { key: "not", detail: "!expr", build: (e) => `!${e}$0` },
  { key: "return", detail: "return expr", build: (e) => `return ${e}$0` },
  { key: "const", detail: "const name = expr", build: (e) => `const \${1:name} = ${e}$0` },
  { key: "let", detail: "let name = expr", build: (e) => `let \${1:name} = ${e}$0` },
  { key: "await", detail: "await expr", build: (e) => `await ${e}$0` },
  { key: "for", detail: "for (const item of expr) { … }", build: (e) => `for (const \${1:item} of ${e}) {\n\t$0\n}` },
];

export function registerPostfixCompletions() {
  monaco.languages.registerCompletionItemProvider(
    ["typescript", "javascript"],
    {
      triggerCharacters: ["."],
      provideCompletionItems(model, position) {
        if (!isRefactorLanguage(model.getLanguageId()))
          return { suggestions: [] };
        const line = model.getLineContent(position.lineNumber);
        const word = model.getWordUntilPosition(position);
        const dotColumn = word.startColumn - 1;
        if (dotColumn < 1 || line[dotColumn - 1] !== ".")
          return { suggestions: [] };
        const start = expressionStart(line, dotColumn - 1);
        if (start === null) return { suggestions: [] };
        const expr = line.slice(start, dotColumn - 1);
        const range = new monaco.Range(
          position.lineNumber,
          start + 1,
          position.lineNumber,
          word.endColumn,
        );
        return {
          suggestions: TEMPLATES.map((t) => ({
            label: { label: t.key, description: "postfix" },
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: t.detail,
            filterText: `${expr}.${t.key}`,
            insertText: t.build(expr),
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `￾${t.key}`,
          })),
        };
      },
    },
  );
}
