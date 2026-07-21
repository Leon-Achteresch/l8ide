import * as monaco from "monaco-editor";
import { useFileIndexStore } from "@/lib/file-index";
import { relativePath } from "@/lib/markdown-path-core";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import { useWorkspaceStore } from "@/lib/workspace-store";

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "";
}

export function registerMarkdownPathCompletions() {
  monaco.languages.registerCompletionItemProvider("markdown", {
    triggerCharacters: ["(", "/"],
    provideCompletionItems(model, position) {
      const line = model
        .getLineContent(position.lineNumber)
        .slice(0, position.column - 1);
      const m = /\]\(\s*([^)\s]*)$/.exec(line);
      if (!m) return { suggestions: [] };
      const typed = m[1];
      if (/^[a-z]+:/i.test(typed) || typed.startsWith("#"))
        return { suggestions: [] };

      const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
      const files = useFileIndexStore.getState().files;
      if (!root || files.length === 0) return { suggestions: [] };
      const fromDir = dirOf(pathFromMonacoUri(model.uri));

      const startCol = position.column - typed.length;
      const range = new monaco.Range(
        position.lineNumber,
        startCol,
        position.lineNumber,
        position.column,
      );
      return {
        suggestions: files.slice(0, 2000).map((abs) => {
          const rel = relativePath(fromDir, abs);
          const name = abs.split("/").pop() ?? abs;
          return {
            label: rel,
            kind: monaco.languages.CompletionItemKind.File,
            detail: name,
            insertText: rel,
            filterText: `${rel} ${name}`,
            range,
          };
        }),
      };
    },
  });
}
