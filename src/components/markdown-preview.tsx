import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import DOMPurify from "dompurify";
import { marked } from "marked";
import type * as Monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";

function render(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string);
}

export function MarkdownPreview({ path }: { path: string }) {
  const monaco = getMonacoInstance();
  const [html, setHtml] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!monaco) return;
    const uri = monacoUriForPath(path);

    let model = monaco.editor.getModel(uri);
    const disposers: Monaco.IDisposable[] = [];

    const attach = (m: Monaco.editor.ITextModel) => {
      setHtml(render(m.getValue()));
      disposers.push(m.onDidChangeContent(() => setHtml(render(m.getValue()))));

      const editor = monaco.editor
        .getEditors()
        .find((e) => e.getModel()?.uri.toString() === uri.toString());
      if (editor) {
        disposers.push(
          editor.onDidScrollChange(() => {
            const el = ref.current;
            if (!el) return;
            const top = editor.getScrollTop();
            const max = editor.getScrollHeight() - editor.getLayoutInfo().height;
            const ratio = max > 0 ? top / max : 0;
            el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
          }),
        );
      }
    };

    if (model) attach(model);
    else
      disposers.push(
        monaco.editor.onDidCreateModel((m) => {
          if (m.uri.toString() === uri.toString()) attach(m);
        }),
      );

    return () => disposers.forEach((d) => d.dispose());
  }, [monaco, path]);

  return (
    <div
      ref={ref}
      className="markdown-preview h-full overflow-auto bg-background px-8 py-6 text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
