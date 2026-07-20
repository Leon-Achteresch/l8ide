import type * as monacoNs from "monaco-editor";
import { useDebugger } from "@/lib/debugger";

export function attachBreakpointGutter(
  editor: monacoNs.editor.ICodeEditor,
  monaco: typeof monacoNs,
  path: string,
) {
  const collection = editor.createDecorationsCollection([]);

  const render = () => {
    const lines = useDebugger.getState().breakpoints[path] ?? [];
    collection.set(
      lines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          glyphMarginClassName: "l8-breakpoint",
          glyphMarginHoverMessage: { value: "Breakpoint entfernen" },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      })),
    );
  };

  const mouseSub = editor.onMouseDown((e) => {
    if (
      e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
      e.target.position
    ) {
      useDebugger
        .getState()
        .toggleBreakpoint(path, e.target.position.lineNumber);
    }
  });

  let prev = useDebugger.getState().breakpoints[path];
  const unsub = useDebugger.subscribe((s) => {
    if (s.breakpoints[path] !== prev) {
      prev = s.breakpoints[path];
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
