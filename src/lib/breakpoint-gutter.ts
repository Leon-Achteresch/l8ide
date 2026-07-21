import type * as monacoNs from "monaco-editor";
import { useDebugger } from "@/lib/debugger";

export function attachBreakpointGutter(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  path: string,
) {
  const collection = editor.createDecorationsCollection([]);

  const render = () => {
    const { breakpoints, bpConditions, bpLogpoints, bpHitCounts } =
      useDebugger.getState();
    const lines = breakpoints[path] ?? [];
    collection.set(
      lines.map((line) => {
        const condition = bpConditions[`${path}:${line}`];
        const log = bpLogpoints[`${path}:${line}`];
        const hits = bpHitCounts[`${path}:${line}`];
        const className = log
          ? "l8-breakpoint l8-breakpoint-log"
          : hits
            ? "l8-breakpoint l8-breakpoint-hits"
            : condition
              ? "l8-breakpoint l8-breakpoint-cond"
              : "l8-breakpoint";
        const hover = log
          ? `Logpoint: \`${log}\` — Klick entfernt, Alt+Klick bearbeitet`
          : hits
            ? `Hit-Count: hält ab Treffer ${hits} — Klick entfernt, Alt+Klick bearbeitet`
            : condition
              ? `Bedingung: \`${condition}\` — Klick entfernt, Alt+Klick bearbeitet`
              : "Breakpoint — Klick entfernt, Alt+Klick: Bedingung/Logpoint";
        return {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            glyphMarginClassName: className,
            glyphMarginHoverMessage: { value: hover },
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
  let prevLog = useDebugger.getState().bpLogpoints;
  let prevHits = useDebugger.getState().bpHitCounts;
  const unsub = useDebugger.subscribe((s) => {
    if (
      s.breakpoints[path] !== prevBp ||
      s.bpConditions !== prevCond ||
      s.bpLogpoints !== prevLog ||
      s.bpHitCounts !== prevHits
    ) {
      prevBp = s.breakpoints[path];
      prevCond = s.bpConditions;
      prevLog = s.bpLogpoints;
      prevHits = s.bpHitCounts;
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
