import Editor, { DiffEditor } from "@monaco-editor/react";
import { invoke } from "@tauri-apps/api/core";
import { Check } from "lucide-react";
import type * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGitStore } from "@/lib/git-store";
import { ideMonacoTheme } from "@/lib/ide-theme";
import { languageOf } from "@/lib/language-of";
import { useMergeConflictStore } from "@/lib/merge-conflict-store";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

type Versions = { base: string; ours: string; theirs: string; current: string };

function HeaderButton({
  label,
  onClick,
  primary,
}: {
  label: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          : "inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}

export function MergeConflictPage({ route }: { route: string }) {
  const descriptor = useMergeConflictStore((s) => s.conflicts[route]);
  const { resolvedTheme } = useTheme();
  const [versions, setVersions] = useState<Versions | null>(null);
  const resultRef = useRef<monaco.editor.ICodeEditor | null>(null);

  useEffect(() => {
    if (!descriptor) return;
    let cancelled = false;
    void invoke<Versions>("git_get_conflict_versions", {
      path: descriptor.repoPath,
      file: descriptor.file,
    })
      .then((v) => {
        if (!cancelled) setVersions(v);
      })
      .catch((e) => toast.error(String(e)));
    return () => {
      cancelled = true;
    };
  }, [descriptor]);

  if (!descriptor) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Kein Konflikt ausgewählt.
      </div>
    );
  }
  if (!versions) {
    return <div className="p-4 text-sm text-muted-foreground">Lädt…</div>;
  }

  const language = languageOf(descriptor.file);
  const theme = ideMonacoTheme(resolvedTheme === "dark");

  const setResult = (content: string) => {
    resultRef.current?.setValue(content);
    resultRef.current?.focus();
  };

  const saveResolved = async () => {
    const content = resultRef.current?.getValue();
    if (content == null) return;
    try {
      await invoke("git_save_resolved_file", {
        path: descriptor.repoPath,
        file: descriptor.file,
        content,
      });
      toast.success("Konflikt als gelöst markiert");
      useWorkspaceStore.getState().closeTab(pageTab(route));
      await useGitStore.getState().refresh();
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b px-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {descriptor.file}
        </span>
        <HeaderButton label="Current übernehmen" onClick={() => setResult(versions.ours)} />
        <HeaderButton label="Incoming übernehmen" onClick={() => setResult(versions.theirs)} />
        <HeaderButton
          primary
          onClick={() => void saveResolved()}
          label={
            <>
              <Check className="size-3" strokeWidth={2.5} />
              Als gelöst speichern
            </>
          }
        />
      </div>
      <div className="grid h-8 shrink-0 grid-cols-2 items-center px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Current (eigener Stand)</span>
        <span>Incoming (eingehend)</span>
      </div>
      <div className="min-h-0 flex-[1.2]">
        <DiffEditor
          height="100%"
          language={language}
          original={versions.ours}
          modified={versions.theirs}
          theme={theme}
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 12,
            renderOverviewRuler: false,
          }}
        />
      </div>
      <div className="flex h-7 shrink-0 items-center bg-foreground/[0.03] px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ergebnis (editierbar)
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={language}
          defaultValue={versions.current}
          theme={theme}
          onMount={(editor) => {
            resultRef.current = editor;
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 12,
          }}
        />
      </div>
    </div>
  );
}
