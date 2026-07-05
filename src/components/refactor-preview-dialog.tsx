import { DiffEditor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ideMonacoTheme } from "@/lib/ide-theme";
import { useRefactorPreview, useRenamePrompt } from "@/lib/refactor-preview";
import { commitRefactor } from "@/lib/ts-refactor";
import { cn } from "@/lib/utils";

function basename(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function languageOf(uri: string): string {
  if (/\.tsx?$/i.test(uri)) return "typescript";
  if (/\.(jsx?|mjs|cjs)$/i.test(uri)) return "javascript";
  if (/\.json$/i.test(uri)) return "json";
  if (/\.css$/i.test(uri)) return "css";
  if (/\.html?$/i.test(uri)) return "html";
  return "typescript";
}

export function RefactorDialogs() {
  return (
    <>
      <RefactorPreviewDialog />
      <RenamePromptDialog />
    </>
  );
}

function RefactorPreviewDialog() {
  const { resolvedTheme } = useTheme();
  const open = useRefactorPreview((s) => s.open);
  const title = useRefactorPreview((s) => s.title);
  const edits = useRefactorPreview((s) => s.edits);
  const included = useRefactorPreview((s) => s.included);
  const activeUri = useRefactorPreview((s) => s.activeUri);
  const rename = useRefactorPreview((s) => s.rename);
  const setActive = useRefactorPreview((s) => s.setActive);
  const toggle = useRefactorPreview((s) => s.toggle);
  const close = useRefactorPreview((s) => s.close);

  const active = edits.find((e) => e.uri === activeUri) ?? edits[0];
  const anyIncluded = edits.some((e) => included[e.uri]);

  const apply = () => {
    const chosen = edits.filter((e) => included[e.uri]);
    const target =
      rename && chosen.some((e) => e.uri === rename.uri) ? rename : undefined;
    close();
    void commitRefactor(chosen, target);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="flex h-[80vh] w-[min(1100px,95vw)] max-w-[min(1100px,95vw)] flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="w-56 shrink-0 space-y-0.5 overflow-auto rounded-md border p-1">
            {edits.map((edit) => (
              <button
                key={edit.uri}
                type="button"
                onClick={() => setActive(edit.uri)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-foreground/6",
                  edit.uri === active?.uri && "bg-foreground/8",
                )}
              >
                <Checkbox
                  checked={Boolean(included[edit.uri])}
                  onCheckedChange={() => toggle(edit.uri)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="min-w-0 flex-1 truncate font-mono">
                  {basename(edit.path)}
                  {edit.isNew && (
                    <span className="text-emerald-600 dark:text-emerald-500">
                      {" "}
                      (neu)
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">{edit.changes.length}</span>
              </button>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden rounded-md border">
            {active && (
              <DiffEditor
                key={active.uri}
                height="100%"
                language={languageOf(active.uri)}
                original={active.oldText}
                modified={active.newText}
                theme={ideMonacoTheme(resolvedTheme === "dark")}
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
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            Abbrechen
          </Button>
          <Button type="button" onClick={apply} disabled={!anyIncluded}>
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenamePromptDialog() {
  const open = useRenamePrompt((s) => s.open);
  const label = useRenamePrompt((s) => s.label);
  const initial = useRenamePrompt((s) => s.initial);
  const submit = useRenamePrompt((s) => s.submit);
  const cancel = useRenamePrompt((s) => s.cancel);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = value.trim();
            if (trimmed) submit(trimmed);
            else cancel();
          }}
        >
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="h-9 font-mono"
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={cancel}>
              Abbrechen
            </Button>
            <Button type="submit">Umbenennen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
