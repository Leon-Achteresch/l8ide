import Editor from "@monaco-editor/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Columns2 } from "lucide-react";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { applyEditorConfig } from "@/lib/editorconfig";
import { attachGitGutter } from "@/lib/git-gutter";
import { useGitStore } from "@/lib/git-store";
import { useEditorZoom } from "@/lib/editor-zoom";
import { useEditorDisplayOptions } from "@/lib/editor-settings";
import { ideMonacoTheme } from "@/lib/ide-theme";
import { formatAndSave, usePrettierSettings } from "@/lib/prettier-format";
import { registerEditorRefactors } from "@/lib/ts-refactor";
import { useWorkspaceStore } from "@/lib/workspace-store";
import {
  revealInEditor,
  takePendingReveal,
} from "@/lib/monaco-navigation";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { MarkdownPreview } from "@/components/markdown-preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import "@/lib/monaco";

type OpenFile = { path: string; content: string };

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;
const MARKDOWN_EXTENSIONS = /\.(md|markdown|mdx)$/i;

function ImageViewer({ path }: { path: string }) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <img
        src={convertFileSrc(path)}
        alt={path}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

export function FileEditor({ path }: { path: string }) {
  if (IMAGE_EXTENSIONS.test(path)) {
    return <ImageViewer path={path} />;
  }
  if (MARKDOWN_EXTENSIONS.test(path)) {
    return <MarkdownEditor path={path} />;
  }
  return <TextEditor path={path} />;
}

function MarkdownEditor({ path }: { path: string }) {
  const [preview, setPreview] = useState(true);
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-end border-b px-2">
        <button
          type="button"
          title="Toggle preview"
          aria-label="Toggle preview"
          aria-pressed={preview}
          onClick={() => setPreview((p) => !p)}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-foreground/8",
            preview ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Columns2 className="size-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {preview ? (
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={50} minSize={20}>
              <TextEditor path={path} />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              <MarkdownPreview path={path} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <TextEditor path={path} />
        )}
      </div>
    </div>
  );
}

function TextEditor({ path }: { path: string }) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const fontSize = useEditorZoom((s) => s.fontSize);
  const displayOptions = useEditorDisplayOptions();
  const formatOnPaste = usePrettierSettings((s) => s.formatOnPaste);
  const formatOnType = usePrettierSettings((s) => s.formatOnType);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !file || file.path !== path) return;
    const target = takePendingReveal(path);
    if (target) revealInEditor(editor, target);
  }, [path, file]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (monaco.editor.getModel(monacoUriForPath(path))) {
      setFile({ path, content: "" });
      return;
    }
    readTextFile(path)
      .then((content) => {
        if (!cancelled) setFile({ path, content });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not open file: {error}
      </div>
    );
  }

  if (!file) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <Editor
      path={file.path}
      defaultValue={file.content}
      theme={ideMonacoTheme(resolvedTheme === "dark")}
      options={{
        ...displayOptions,
        fontSize,
        minimap: { enabled: false },
        automaticLayout: true,
        links: true,
        inlayHints: { enabled: "on" },
        formatOnPaste,
        formatOnType,
      }}
      onMount={(editor) => {
        editorRef.current = editor;
        registerEditorRefactors(editor, monaco);
        const model = editor.getModel();
        if (model && usePrettierSettings.getState().editorConfig) {
          void applyEditorConfig(model);
        }
        const target = takePendingReveal(path);
        if (target) revealInEditor(editor, target);

        const gutter = attachGitGutter(editor, monaco, path);
        const unsubGutter = useGitStore.subscribe(() => void gutter.refresh());
        let gutterTimer: ReturnType<typeof setTimeout> | undefined;
        editor.onDidDispose(() => {
          unsubGutter();
          gutter.dispose();
          clearTimeout(gutterTimer);
        });

        let timer: ReturnType<typeof setTimeout> | undefined;
        editor.onDidChangeModelContent(() => {
          useWorkspaceStore.getState().promoteTab(path);
          clearTimeout(gutterTimer);
          gutterTimer = setTimeout(() => void gutter.refresh(), 400);
          const { autoSave, autoSaveDelay } = useWorkspaceStore.getState();
          if (!autoSave) return;
          const model = editor.getModel();
          if (!model) return;
          clearTimeout(timer);
          timer = setTimeout(() => void formatAndSave(model), autoSaveDelay);
        });
      }}
    />
  );
}
