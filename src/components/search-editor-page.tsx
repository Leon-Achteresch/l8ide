import { Search } from "lucide-react";
import { fileIcon } from "@/lib/file-icons";
import { openFileAt } from "@/lib/monaco-navigation";
import { useSearchEditor } from "@/lib/search-editor-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

function highlightParts(preview: string, query: string) {
  const lower = preview.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return [preview];
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  for (;;) {
    const hit = lower.indexOf(q, i);
    if (hit < 0) {
      parts.push(preview.slice(i));
      return parts;
    }
    parts.push(preview.slice(i, hit));
    parts.push(
      <mark
        key={key++}
        className="rounded-sm bg-amber-400/30 text-inherit"
      >
        {preview.slice(hit, hit + q.length)}
      </mark>,
    );
    i = hit + q.length;
  }
}

export function SearchEditorPage({ route }: { route: string }) {
  const snapshot = useSearchEditor((s) => s.snapshots[route]);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);

  if (!snapshot) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Suchergebnis nicht mehr verfügbar.
      </div>
    );
  }

  const rel = (p: string) =>
    rootPath && p.startsWith(`${rootPath}/`) ? p.slice(rootPath.length + 1) : p;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <h1 className="font-mono text-sm font-semibold text-foreground">
            {snapshot.query}
          </h1>
          <span className="text-xs text-muted-foreground">
            {snapshot.total} Treffer in {snapshot.files.length} Dateien ·{" "}
            {new Date(snapshot.time).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="mt-4 space-y-4">
          {snapshot.files.map((file) => {
            const name = file.path.split("/").pop() ?? file.path;
            const FileIcon = tabIcons ? fileIcon(name) : null;
            return (
              <div key={file.path}>
                <button
                  type="button"
                  onClick={() => openFileAt(file.path, { line: 1, column: 1 })}
                  className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-foreground hover:bg-foreground/[0.05]"
                >
                  {FileIcon && <FileIcon className="size-3.5" />}
                  {rel(file.path)}
                  <span className="font-normal text-muted-foreground">
                    {file.matches.length}
                  </span>
                </button>
                <div className="mt-1 space-y-px">
                  {file.matches.map((m, i) => (
                    <button
                      key={`${m.line}:${m.column}:${i}`}
                      type="button"
                      onClick={() =>
                        openFileAt(file.path, {
                          line: m.line,
                          column: m.column,
                        })
                      }
                      className="flex w-full items-start gap-3 rounded-md px-1 py-0.5 text-left font-mono text-[11px] leading-relaxed hover:bg-foreground/[0.04]"
                    >
                      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground/60">
                        {m.line}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-foreground/85">
                        {highlightParts(m.preview.trim(), snapshot.query)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
