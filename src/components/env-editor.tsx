import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Eye, EyeOff, KeyRound, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TextEditor } from "@/components/file-editor";
import {
  maskValue,
  parseEnv,
  serializeEnv,
  setEnvValue,
  type EnvLine,
} from "@/lib/env-parse";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";
import { cn } from "@/lib/utils";

function EnvTable({ path }: { path: string }) {
  const [lines, setLines] = useState<EnvLine[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const load = () =>
    void readTextFile(path)
      .then((t) => setLines(parseEnv(t)))
      .catch(() => setLines([]));

  useEffect(load, [path]);

  const pairs = lines.filter((l) => l.kind === "pair") as Extract<
    EnvLine,
    { kind: "pair" }
  >[];

  const persist = async (next: EnvLine[]) => {
    setLines(next);
    const text = serializeEnv(next);
    await writeTextFile(path, text);
    const model = getMonacoInstance()?.editor.getModel(monacoUriForPath(path));
    if (model && !model.isDisposed() && model.getValue() !== text)
      model.setValue(text);
  };

  const saveEdit = (key: string) => {
    void persist(setEnvValue(lines, key, draft));
    setEditing(null);
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto max-w-2xl">
        {pairs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Keine KEY=VALUE-Einträge.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-foreground/[0.02]">
            {pairs.map((p) => {
              const shown = revealed.has(p.key);
              return (
                <div
                  key={p.key}
                  className="flex items-center gap-3 px-3 py-1.5 text-xs"
                >
                  <KeyRound className="size-3 shrink-0 text-muted-foreground" />
                  <span className="w-40 shrink-0 truncate font-mono font-medium text-foreground">
                    {p.key}
                  </span>
                  {editing === p.key ? (
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(p.key);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      onBlur={() => saveEdit(p.key)}
                      className="min-w-0 flex-1 rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p.key);
                        setDraft(p.value);
                        setRevealed((s) => new Set(s).add(p.key));
                      }}
                      className="min-w-0 flex-1 truncate text-left font-mono text-muted-foreground hover:text-foreground"
                    >
                      {shown ? p.value : maskValue(p.value)}
                    </button>
                  )}
                  <button
                    type="button"
                    title={shown ? "Verbergen" : "Anzeigen"}
                    onClick={() =>
                      setRevealed((s) => {
                        const n = new Set(s);
                        n.has(p.key) ? n.delete(p.key) : n.add(p.key);
                        return n;
                      })
                    }
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                  >
                    {shown ? (
                      <EyeOff className="size-3" />
                    ) : (
                      <Eye className="size-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function EnvEditor({ path }: { path: string }) {
  const [masked, setMasked] = useState(true);
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-b px-2">
        <button
          type="button"
          title={masked ? "Als Text bearbeiten" : "Maskierte Tabelle"}
          onClick={() => setMasked((v) => !v)}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] transition-colors hover:bg-foreground/8",
            masked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Table2 className="size-3.5" />
          {masked ? "Maskiert" : "Text"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {masked ? <EnvTable path={path} /> : <TextEditor path={path} />}
      </div>
    </div>
  );
}
