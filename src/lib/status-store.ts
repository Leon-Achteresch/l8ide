import type * as monaco from "monaco-editor";
import { create } from "zustand";

type EditorStatus = {
  editor: monaco.editor.ICodeEditor | null;
  line: number;
  column: number;
  selections: number;
  selectedChars: number;
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
    const selectedChars = sels.reduce(
      (n, s) => n + model.getValueLengthInRange(s),
      0,
    );
    const opts = model.getOptions();
    useEditorStatus.setState({
      editor,
      line: pos?.lineNumber ?? 1,
      column: pos?.column ?? 1,
      selections: sels.length,
      selectedChars,
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
