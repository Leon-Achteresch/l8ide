import type * as monacoNs from "monaco-editor";
import { lintA11y } from "@/lib/a11y-lint-core";
import { clearTaskMarkers, setTaskMarkers } from "@/lib/markers-store";
import { useEditorSettings } from "@/lib/editor-settings";

const A11Y_SOURCE = 90001;
const LINT_LANGS = new Set(["typescriptreact", "javascriptreact", "html"]);
const markers = new Map<string, ReturnType<typeof lintA11y>>();

function flush() {
  const all = [...markers.entries()].flatMap(([path, findings]) =>
    findings.map((f) => ({
      path,
      line: f.line,
      column: f.column,
      severity: "warning" as const,
      message: `a11y: ${f.message}`,
    })),
  );
  setTaskMarkers(A11Y_SOURCE, all);
}

export function attachA11yLint(
  editor: monacoNs.editor.ICodeEditor,
  path: string,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    const model = editor.getModel();
    if (!model) return;
    if (
      !useEditorSettings.getState().a11yLint ||
      !LINT_LANGS.has(model.getLanguageId())
    ) {
      if (markers.delete(path)) flush();
      return;
    }
    markers.set(path, lintA11y(model.getValue()));
    flush();
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 500);
  };
  run();
  const sub = editor.onDidChangeModelContent(schedule);
  const unsub = useEditorSettings.subscribe(run);
  editor.onDidDispose(() => {
    clearTimeout(timer);
    sub.dispose();
    unsub();
    if (markers.delete(path)) flush();
    if (markers.size === 0) clearTaskMarkers(A11Y_SOURCE);
  });
}
