import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useWorkspaceStore.getState().openFile(pageTab("/settings"));
    setMounted(true);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <div className="mt-4 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium">Dark Mode</p>
          <p className="text-xs text-muted-foreground">
            Zwischen hellem und dunklem Design wechseln
          </p>
        </div>
        {mounted && (
          <Switch
            checked={resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        )}
      </div>
    </div>
  );
}
