import type * as monacoNs from "monaco-editor";
import { useDebugger } from "@/lib/debugger";

export function attachBreakpointGutter(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  path: string,
) {
  const collection = editor.createDecorationsCollection([]);

  const render = () => {
    const { breakpoints, bpConditions } = useDebugger.getState();
    const lines = breakpoints[path] ?? [];
    collection.set(
      lines.map((line) => {
        const condition = bpConditions[`${path}:${line}`];
        return {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            glyphMarginClassName: condition
              ? "l8-breakpoint l8-breakpoint-cond"
              : "l8-breakpoint",
            glyphMarginHoverMessage: {
              value: condition
                ? `Bedingung: \`${condition}\` — Klick entfernt, Alt+Klick bearbeitet`
                : "Breakpoint — Klick entfernt, Alt+Klick macht ihn bedingt",
            },
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        };
      }),
    );
  };

  const mouseSub = editor.onMouseDown((e) => {
    if (
      e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
      e.target.position
    ) {
      const line = e.target.position.lineNumber;
      if (e.event.altKey) {
        useDebugger.getState().setConditionTarget({ path, line });
      } else {
        useDebugger.getState().toggleBreakpoint(path, line);
      }
    }
  });

  let prevBp = useDebugger.getState().breakpoints[path];
  let prevCond = useDebugger.getState().bpConditions;
  const unsub = useDebugger.subscribe((s) => {
    if (s.breakpoints[path] !== prevBp || s.bpConditions !== prevCond) {
      prevBp = s.breakpoints[path];
      prevCond = s.bpConditions;
      render();
    }
  });

  render();
  editor.onDidDispose(() => {
    mouseSub.dispose();
    unsub();
    collection.clear();
  });
}
