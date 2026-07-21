import type * as monacoNs from "monaco-editor";
import { useDebugger } from "@/lib/debugger";
import { inlineValuesForLine, type InlineVar } from "@/lib/inline-values-core";

function framePath(url: string): string {
  return url.startsWith("file://") ? decodeURI(url.slice(7)) : url;
}

export function attachInlineValues(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  absPath: string,
) {
  const collection = editor.createDecorationsCollection([]);
  let disposed = false;

  const render = () => {
    if (disposed) return;
    const s = useDebugger.getState();
    const top = s.frames[0];
    if (s.state !== "paused" || !top || framePath(top.url) !== absPath) {
      collection.clear();
      return;
    }
    const model = editor.getModel();
    if (!model) return;
    const vars: InlineVar[] = s.variables.map((v) => ({
      name: v.name,
      value: v.value,
    }));
    const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
    for (const vr of editor.getVisibleRanges()) {
      for (let line = vr.startLineNumber; line <= vr.endLineNumber; line++) {
        const content = inlineValuesForLine(model.getLineContent(line), vars);
        if (!content) continue;
        const col = model.getLineMaxColumn(line);
        decos.push({
          range: new monaco.Range(line, col, line, col),
          options: {
            after: { content: `  ${content}`, inlineClassName: "l8-inline-value" },
            showIfCollapsed: true,
          },
        });
      }
    }
    collection.set(decos);
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 60);
  };

  const subs = [
    editor.onDidScrollChange(() => {
      if (useDebugger.getState().state === "paused") schedule();
    }),
  ];
  const unsub = useDebugger.subscribe(schedule);
  render();

  editor.onDidDispose(() => {
    disposed = true;
    clearTimeout(timer);
    for (const sub of subs) sub.dispose();
    unsub();
    collection.clear();
  });
}
