import type { editor } from "monaco-editor";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WhitespaceRender = "none" | "boundary" | "trailing" | "selection" | "all";

type EditorSettings = {
  wordWrap: boolean;
  wordWrapColumn: number;
  fontLigatures: boolean;
  rulers: number[];
  colorDecorators: boolean;
  unicodeHighlight: boolean;
  renderWhitespace: WhitespaceRender;
  renderControlCharacters: boolean;
  semanticHighlighting: boolean;
  stickyScroll: boolean;
  breadcrumbs: boolean;
  setWordWrap: (v: boolean) => void;
  setWordWrapColumn: (v: number) => void;
  setFontLigatures: (v: boolean) => void;
  setRulers: (v: number[]) => void;
  setColorDecorators: (v: boolean) => void;
  setUnicodeHighlight: (v: boolean) => void;
  setRenderWhitespace: (v: WhitespaceRender) => void;
  setRenderControlCharacters: (v: boolean) => void;
  setSemanticHighlighting: (v: boolean) => void;
  setStickyScroll: (v: boolean) => void;
  setBreadcrumbs: (v: boolean) => void;
};

export const useEditorSettings = create<EditorSettings>()(
  persist(
    (set) => ({
      wordWrap: false,
      wordWrapColumn: 0,
      fontLigatures: false,
      rulers: [],
      colorDecorators: true,
      unicodeHighlight: true,
      renderWhitespace: "selection",
      renderControlCharacters: true,
      semanticHighlighting: true,
      stickyScroll: true,
      breadcrumbs: true,
      setWordWrap: (wordWrap) => set({ wordWrap }),
      setWordWrapColumn: (wordWrapColumn) =>
        set({ wordWrapColumn: Math.max(0, Math.min(400, Math.round(wordWrapColumn))) }),
      setFontLigatures: (fontLigatures) => set({ fontLigatures }),
      setRulers: (rulers) => set({ rulers }),
      setColorDecorators: (colorDecorators) => set({ colorDecorators }),
      setUnicodeHighlight: (unicodeHighlight) => set({ unicodeHighlight }),
      setRenderWhitespace: (renderWhitespace) => set({ renderWhitespace }),
      setRenderControlCharacters: (renderControlCharacters) =>
        set({ renderControlCharacters }),
      setSemanticHighlighting: (semanticHighlighting) =>
        set({ semanticHighlighting }),
      setStickyScroll: (stickyScroll) => set({ stickyScroll }),
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
    }),
    { name: "editor-settings" },
  ),
);

export function toMonacoOptions(s: EditorSettings): editor.IEditorOptions {
  const opts: editor.IEditorOptions = {
    wordWrap: s.wordWrap ? (s.wordWrapColumn > 0 ? "bounded" : "on") : "off",
    wordWrapColumn: s.wordWrapColumn > 0 ? s.wordWrapColumn : 80,
    wrappingIndent: "indent",
    fontLigatures: s.fontLigatures,
    rulers: s.rulers,
    colorDecorators: s.colorDecorators,
    unicodeHighlight: {
      ambiguousCharacters: s.unicodeHighlight,
      invisibleCharacters: s.unicodeHighlight,
      nonBasicASCII: false,
    },
    renderWhitespace: s.renderWhitespace,
    renderControlCharacters: s.renderControlCharacters,
    stickyScroll: { enabled: s.stickyScroll },
  };
  (opts as Record<string, unknown>)["semanticHighlighting.enabled"] =
    s.semanticHighlighting;
  return opts;
}

export function useEditorDisplayOptions(): editor.IEditorOptions {
  const s = useEditorSettings();
  return useMemo(() => toMonacoOptions(s), [s]);
}
