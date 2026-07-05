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

function semanticRules(c: {
  type: string;
  iface: string;
  func: string;
  variable: string;
  parameter: string;
  property: string;
  constant: string;
}) {
  return [
    { token: "class", foreground: c.type },
    { token: "enum", foreground: c.type },
    { token: "interface", foreground: c.iface },
    { token: "namespace", foreground: c.type },
    { token: "typeParameter", foreground: c.type },
    { token: "type", foreground: c.type },
    { token: "function", foreground: c.func },
    { token: "member", foreground: c.func },
    { token: "property", foreground: c.property },
    { token: "variable", foreground: c.variable },
    { token: "parameter", foreground: c.parameter },
    { token: "enumMember", foreground: c.constant },
    { token: "variable.readonly", foreground: c.constant },
    { token: "variable.defaultLibrary", foreground: c.type },
  ];
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
    rules: semanticRules({
      type: "267f99",
      iface: "267f99",
      func: "795e26",
      variable: "001080",
      parameter: "001080",
      property: "0451a5",
      constant: "0070c1",
    }),
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
    rules: semanticRules({
      type: "4ec9b0",
      iface: "4ec9b0",
      func: "dcdcaa",
      variable: "9cdcfe",
      parameter: "9cdcfe",
      property: "9cdcfe",
      constant: "4fc1ff",
    }),
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
