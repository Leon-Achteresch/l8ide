import { getMonacoInstance } from "@/lib/monaco-instance";
import { createMarkdownBridge } from "@/lib/markdown-sync";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { editsFor } from "@/lib/prettier-format";
import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/kit/utils";
import "@milkdown/crepe/theme/common/style.css";
import crepeLight from "@milkdown/crepe/theme/frame.css?inline";
import crepeDark from "@milkdown/crepe/theme/frame-dark.css?inline";
import type * as Monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export function MarkdownRichEditor({
  path,
  sourceEditor,
}: {
  path: string;
  sourceEditor: Monaco.editor.ICodeEditor | null;
}) {
  const { resolvedTheme } = useTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const monaco = getMonacoInstance();
    const root = rootRef.current;
    if (!monaco || !root) return;
    const uri = monacoUriForPath(path);
    const disposers: Monaco.IDisposable[] = [];
    let crepe: Crepe | null = null;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const destroy = () => {
      const c = crepe;
      crepe = null;
      clearTimeout(debounce);
      c?.destroy().catch(() => {});
    };

    const start = (model: Monaco.editor.ITextModel) => {
      const bridge = createMarkdownBridge(model.getValue());
      const instance = new Crepe({ root, defaultValue: model.getValue() });
      crepe = instance;

      instance.on((listener) => {
        listener.markdownUpdated((_ctx, markdown) => {
          bridge.fromCrepe(markdown, (md) => {
            const edits = editsFor(model, model.getValue(), md);
            if (edits.length) model.pushEditOperations(null, edits, () => null);
          });
        });
      });

      const toCrepe = (md: string) =>
        bridge.fromModel(md, (next) => {
          instance.editor.action(replaceAll(next));
          return instance.getMarkdown();
        });

      instance.create().then(() => {
        if (crepe !== instance) {
          instance.destroy().catch(() => {});
          return;
        }
        bridge.setReady(instance.getMarkdown());
        toCrepe(model.getValue());
      });

      disposers.push(
        model.onDidChangeContent(() => {
          if (!bridge.isReady()) return;
          if (root.contains(document.activeElement)) return;
          const md = model.getValue();
          clearTimeout(debounce);
          debounce = setTimeout(() => toCrepe(md), 150);
        }),
      );
    };

    const existing = monaco.editor.getModel(uri);
    if (existing) start(existing);
    else
      disposers.push(
        monaco.editor.onDidCreateModel((m) => {
          if (m.uri.toString() === uri.toString()) start(m);
        }),
      );

    return () => {
      disposers.forEach((d) => d.dispose());
      destroy();
    };
  }, [path]);

  useEffect(() => {
    const editor = sourceEditor;
    const host = hostRef.current;
    if (!editor || !host) return;
    const d = editor.onDidScrollChange(() => {
      const top = editor.getScrollTop();
      const max = editor.getScrollHeight() - editor.getLayoutInfo().height;
      const ratio = max > 0 ? top / max : 0;
      host.scrollTop = ratio * (host.scrollHeight - host.clientHeight);
    });
    return () => d.dispose();
  }, [sourceEditor]);

  return (
    <div
      ref={hostRef}
      className="markdown-rich h-full overflow-auto bg-background"
    >
      <style>{resolvedTheme === "dark" ? crepeDark : crepeLight}</style>
      <div ref={rootRef} />
    </div>
  );
}
