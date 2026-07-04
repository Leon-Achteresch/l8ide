import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  useEffect(() => {
    useWorkspaceStore.getState().openFile(pageTab("/settings"));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nothing to configure yet.
      </p>
    </div>
  );
}
