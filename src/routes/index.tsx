import { createFileRoute } from "@tanstack/react-router";
import { EditorGrid } from "@/components/editor-grid/editor-grid";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <EditorGrid />;
}
