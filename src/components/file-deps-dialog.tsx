import { ArrowDownRight, ArrowUpLeft, Loader2, Network, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDepGraph } from "@/lib/dep-graph-store";
import { useFileDeps } from "@/lib/file-deps";
import { openFileAt } from "@/lib/monaco-navigation";
import { useWorkspaceStore } from "@/lib/workspace-store";

function FileRow({ path }: { path: string }) {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const rel =
    rootPath && path.startsWith(`${rootPath}/`)
      ? path.slice(rootPath.length + 1)
      : path;
  return (
    <button
      type="button"
      onClick={() => {
        useFileDeps.getState().close();
        openFileAt(path, { line: 1, column: 1 });
      }}
      className="block w-full truncate rounded-md px-2 py-1 text-left font-mono text-[11px] text-foreground/85 hover:bg-foreground/[0.05]"
    >
      {rel}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Network;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {title}
      </p>
      {children}
    </div>
  );
}

export function FileDepsDialog() {
  const result = useFileDeps((s) => s.result);
  const loading = useFileDeps((s) => s.loading);
  const close = useFileDeps((s) => s.close);
  if (!result) return null;
  const name = result.path.split("/").pop();

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Network className="size-4 text-muted-foreground" />
            Abhängigkeiten · {name}
            {loading && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <button
              type="button"
              onClick={() => {
                close();
                useDepGraph.getState().openGraph(result.path);
              }}
              className="ml-auto inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-normal text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              <Network className="size-3" />
              Als Graph
            </button>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-96 space-y-3 overflow-y-auto">
          <Section icon={ArrowDownRight} title={`Importiert (${result.imports.length})`}>
            {result.imports.length === 0 && !loading ? (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">Keine Projekt-Importe.</p>
            ) : (
              result.imports.map((p) => <FileRow key={p} path={p} />)
            )}
          </Section>
          <Section icon={ArrowUpLeft} title={`Wird importiert von (${result.importers.length})`}>
            {result.importers.length === 0 && !loading ? (
              <p className="px-2 py-1 text-[11px] text-muted-foreground">Keine Importe gefunden.</p>
            ) : (
              result.importers.map((p) => <FileRow key={p} path={p} />)
            )}
          </Section>
          {result.externals.length > 0 && (
            <Section icon={Package} title={`Pakete (${result.externals.length})`}>
              <p className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {result.externals.join(" · ")}
              </p>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
