import { createFileRoute } from "@tanstack/react-router";
import { FileEditor } from "@/components/file-editor";
import { useWorkspaceStore } from "@/lib/workspace-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const activeFile = useWorkspaceStore((s) => s.activeFile);

  if (!activeFile) {
    return (
      <main className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a file to start editing.
      </main>
    );
  }

  return (
    <main className="h-full">
      <FileEditor path={activeFile} />
    </main>
  );
}
