import * as monaco from "monaco-editor";
import { evaluateOnTopFrame, useDebugger } from "@/lib/debugger";

const EXPR_TAIL = /[\w$][\w$.]*$/;

export function registerDebugHover() {
  monaco.languages.registerHoverProvider(["typescript", "javascript"], {
    async provideHover(model, position) {
      if (useDebugger.getState().state !== "paused") return null;
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const line = model.getLineContent(position.lineNumber);
      const upTo = line.slice(0, word.endColumn - 1);
      const m = EXPR_TAIL.exec(upTo);
      if (!m) return null;
      const expression = m[0];
      if (expression.length > 200) return null;
      const value = await evaluateOnTopFrame(expression);
      if (value === null) return null;
      return {
        range: new monaco.Range(
          position.lineNumber,
          word.endColumn - expression.length,
          position.lineNumber,
          word.endColumn,
        ),
        contents: [
          { value: `**Debug** \`${expression}\` = \`${value}\`` },
        ],
      };
    },
  });
}
