import { getMonacoInstance } from "@/lib/monaco-instance";

export const IDE_MONACO_THEME_LIGHT = "l8ide-light";
export const IDE_MONACO_THEME_DARK = "l8ide-dark";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function ideSurfaceColors() {
  return {
    background: cssVar("--ide-surface-bg"),
    foreground: cssVar("--ide-surface-fg"),
    selection: cssVar("--ide-surface-selection"),
  };
}

export function initIdeMonacoThemes() {
  const monaco = getMonacoInstance();
  if (!monaco) return;
  const light = {
    background: "#fafafa",
    foreground: "#3a3a3c",
    lineNumber: "#a0a0a4",
    lineNumberActive: "#6e6e73",
    selection: "#d8e4f4",
    inactiveSelection: "#e8edf4",
    widget: "#f5f5f6",
    border: "#e0e0e2",
  };

  const dark = {
    background: "#1e1e20",
    foreground: "#d0d0d2",
    lineNumber: "#6e6e73",
    lineNumberActive: "#a0a0a4",
    selection: "#3a3d41",
    inactiveSelection: "#2e3033",
    widget: "#222224",
    border: "#3a3a3c66",
  };

  monaco.editor.defineTheme(IDE_MONACO_THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": light.background,
      "editor.foreground": light.foreground,
      "editorLineNumber.foreground": light.lineNumber,
      "editorLineNumber.activeForeground": light.lineNumberActive,
      "editor.selectionBackground": light.selection,
      "editor.inactiveSelectionBackground": light.inactiveSelection,
      "editorCursor.foreground": light.foreground,
      "editorWidget.background": light.widget,
      "editorWidget.border": light.border,
      "input.background": light.widget,
      "dropdown.background": light.widget,
      "list.hoverBackground": "#ececee",
      "minimap.background": light.background,
    },
  });

  monaco.editor.defineTheme(IDE_MONACO_THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": dark.background,
      "editor.foreground": dark.foreground,
      "editorLineNumber.foreground": dark.lineNumber,
      "editorLineNumber.activeForeground": dark.lineNumberActive,
      "editor.selectionBackground": dark.selection,
      "editor.inactiveSelectionBackground": dark.inactiveSelection,
      "editorCursor.foreground": dark.foreground,
      "editorWidget.background": dark.widget,
      "editorWidget.border": dark.border,
      "input.background": dark.widget,
      "dropdown.background": dark.widget,
      "list.hoverBackground": "#2e2e30",
      "minimap.background": dark.background,
    },
  });
}

export function ideMonacoTheme(isDark: boolean) {
  return isDark ? IDE_MONACO_THEME_DARK : IDE_MONACO_THEME_LIGHT;
}
