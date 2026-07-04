import Editor from "@monaco-editor/react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import "@/lib/monaco";

type OpenFile = { path: string; content: string };

export function FileEditor({ path }: { path: string }) {
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
