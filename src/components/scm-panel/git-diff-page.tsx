import { DiffEditor } from "@monaco-editor/react";
import { DIFF_ENHANCEMENTS } from "@/lib/diff-options";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useGitDiffStore } from "@/lib/git-diff-store";
import { ideMonacoTheme } from "@/lib/ide-theme";
import { languageOf } from "@/lib/language-of";

export function GitDiffPage({ route }: { route: string }) {
  const descriptor = useGitDiffStore((s) => s.diffs[route]);
  const { resolvedTheme } = useTheme();
  const [sideBySide, setSideBySide] = useState(true);
  const [original, setOriginal] = useState<string | null>(null);
  const [modified, setModified] = useState<string | null>(null);

  useEffect(() => {
    if (!descriptor) return;
    let cancelled = false;
    const { repoPath, file, kind } = descriptor;
    async function load() {
      const orig = await invoke<string>("repo_file_content_at", {
        path: repoPath,
        file,
        treeish: "HEAD",
      }).catch(() => "");
      const mod =
        kind === "staged"
          ? await invoke<string>("repo_file_content_at", {
              path: repoPath,
              file,
              treeish: "",
            }).catch(() => "")
          : await readTextFile(`${repoPath}/${file}`).catch(() => "");
      if (!cancelled) {
        setOriginal(orig);
        setModified(mod);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [descriptor]);

  if (!descriptor) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Kein Diff ausgewählt.</div>
    );
  }
  if (original === null || modified === null) {
    return <div className="p-4 text-sm text-muted-foreground">Lädt…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-3">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {descriptor.file}
        </span>
        <button
          type="button"
          onClick={() => setSideBySide((v) => !v)}
          className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
        >
          {sideBySide ? "Inline" : "Nebeneinander"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <DiffEditor
          key={`${route}:${sideBySide}`}
          height="100%"
          language={languageOf(descriptor.file)}
          original={original}
          modified={modified}
          theme={ideMonacoTheme(resolvedTheme === "dark")}
          options={{
            ...DIFF_ENHANCEMENTS,
            readOnly: true,
            renderSideBySide: sideBySide,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 12,
            renderOverviewRuler: false,
          }}
        />
      </div>
    </div>
  );
}
