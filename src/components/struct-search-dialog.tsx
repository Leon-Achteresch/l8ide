import { Loader2, SearchCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { openFileAt } from "@/lib/monaco-navigation";
import { useStructSearch } from "@/lib/struct-search";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function StructSearchDialog() {
  const open = useStructSearch((s) => s.open);
  const setOpen = useStructSearch((s) => s.setOpen);
  const pattern = useStructSearch((s) => s.pattern);
  const setPattern = useStructSearch((s) => s.setPattern);
  const results = useStructSearch((s) => s.results);
  const running = useStructSearch((s) => s.running);
  const total = useStructSearch((s) => s.total);
  const rootPath = useWorkspaceStore((s) => s.rootPath);

  const rel = (p: string) =>
    rootPath && p.startsWith(`${rootPath}/`) ? p.slice(rootPath.length + 1) : p;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <SearchCode className="size-4 text-muted-foreground" />
            Strukturelle Suche
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void useStructSearch.getState().run()}
          placeholder="Muster, z.B. console.$M($$$) oder foo($A, $B)"
          spellCheck={false}
          className="h-8 font-mono text-xs"
        />
        <p className="-mt-1 text-[11px] text-muted-foreground">
          <span className="font-mono">$name</span> = ein Token,{" "}
          <span className="font-mono">$$$</span> = beliebig viel. ⏎ sucht.
        </p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {running ? (
            <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Suche…
            </p>
          ) : results.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              {total === 0 && pattern ? "Keine Treffer." : "Muster eingeben und ⏎."}
            </p>
          ) : (
            results.map((file) => (
              <div key={file.path}>
                <p className="truncate px-1 py-0.5 font-mono text-[11px] font-medium text-foreground">
                  {rel(file.path)}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    {file.matches.length}
                  </span>
                </p>
                {file.matches.map((m, i) => (
                  <button
                    key={`${m.line}:${m.column}:${i}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openFileAt(file.path, { line: m.line, column: m.column });
                    }}
                    className="flex w-full items-start gap-3 rounded-md px-1 py-0.5 text-left font-mono text-[11px] hover:bg-foreground/[0.05]"
                  >
                    <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground/60">
                      {m.line}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground/85">
                      {m.text}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
