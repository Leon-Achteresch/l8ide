import type * as monaco from "monaco-editor";
import { create } from "zustand";
import { selectionStats } from "@/lib/selection-stats";

type EditorStatus = {
  editor: monaco.editor.ICodeEditor | null;
  line: number;
  column: number;
  selections: number;
  selectedChars: number;
  selectedWords: number;
  selectedLines: number;
  language: string | null;
  tabSize: number;
  insertSpaces: boolean;
  eol: "LF" | "CRLF";
};

export const useEditorStatus = create<EditorStatus>(() => ({
  editor: null,
  line: 1,
  column: 1,
  selections: 1,
  selectedChars: 0,
  selectedWords: 0,
  selectedLines: 0,
  language: null,
  tabSize: 2,
  insertSpaces: true,
  eol: "LF",
}));

export function trackEditorStatus(editor: monaco.editor.ICodeEditor) {
  const update = () => {
    const model = editor.getModel();
    if (!model) return;
    const pos = editor.getPosition();
    const sels = editor.getSelections() ?? [];
    const selectedText = sels
      .map((s) => model.getValueInRange(s))
      .join("\n");
    const stats = selectionStats(selectedText);
    const opts = model.getOptions();
    useEditorStatus.setState({
      editor,
      line: pos?.lineNumber ?? 1,
      column: pos?.column ?? 1,
      selections: sels.length,
      selectedChars: stats.chars,
      selectedWords: stats.words,
      selectedLines: sels.reduce(
        (n, s) => n + (s.isEmpty() ? 0 : s.endLineNumber - s.startLineNumber + 1),
        0,
      ),
      language: model.getLanguageId(),
      tabSize: opts.tabSize,
      insertSpaces: opts.insertSpaces,
      eol: model.getEOL() === "\n" ? "LF" : "CRLF",
    });
  };
  const subs = [
    editor.onDidFocusEditorText(update),
    editor.onDidChangeCursorSelection(update),
    editor.onDidChangeModelOptions(update),
    editor.onDidChangeModelLanguage(update),
  ];
  update();
  editor.onDidDispose(() => {
    for (const d of subs) d.dispose();
    if (useEditorStatus.getState().editor === editor)
      useEditorStatus.setState({ editor: null, language: null });
  });
}
