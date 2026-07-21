import type * as monaco from "monaco-editor";

export const DIFF_ENHANCEMENTS: monaco.editor.IDiffEditorConstructionOptions = {
  hideUnchangedRegions: {
    enabled: true,
    contextLineCount: 3,
    minimumLineCount: 4,
    revealLineCount: 20,
  },
  experimental: { showMoves: true },
  diffAlgorithm: "advanced",
};
