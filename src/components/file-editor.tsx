import Editor from "@monaco-editor/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import "@/lib/monaco";

type OpenFile = { path: string; content: string };

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i;

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
  return <TextEditor path={path} />;
}

function TextEditor({ path }: { path: string }) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (monaco.editor.getModel(monaco.Uri.parse(path))) {
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
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        automaticLayout: true,
      }}
    />
  );
}
