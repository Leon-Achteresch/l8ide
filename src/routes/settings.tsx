import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  type HiddenScope,
  useIsWorkspaceTrusted,
  useWorkspaceStore,
} from "@/lib/workspace-store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const fileIcons = useWorkspaceStore((s) => s.fileIcons);
  const setFileIcons = useWorkspaceStore((s) => s.setFileIcons);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const setTabIcons = useWorkspaceStore((s) => s.setTabIcons);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
      <div className="mt-4 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium">Datei-Icons</p>
          <p className="text-xs text-muted-foreground">
            Dateityp-Icons in der Sidebar anzeigen
          </p>
        </div>
        <Switch checked={fileIcons} onCheckedChange={setFileIcons} />
      </div>
      <div className="mt-4 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium">Tab-Icons</p>
          <p className="text-xs text-muted-foreground">
            Dateityp-Icons in der Tab-Leiste anzeigen
          </p>
        </div>
        <Switch checked={tabIcons} onCheckedChange={setTabIcons} />
      </div>
      {rootPath && (
        <HiddenList
          scope="workspace"
          title="Ausgeblendet in diesem Workspace"
          description={`Gilt nur für ${rootPath}`}
        />
      )}
      <HiddenList
        scope="global"
        title="Global ausgeblendet"
        description="Gilt in allen Workspaces"
      />
      <WorkspaceTrust />
    </div>
  );
}

function WorkspaceTrust() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const trustedFolders = useWorkspaceStore((s) => s.trustedFolders);
  const trustFolder = useWorkspaceStore((s) => s.trustFolder);
  const revokeTrust = useWorkspaceStore((s) => s.revokeTrust);
  const trusted = useIsWorkspaceTrusted();

  return (
    <div className="mt-6 max-w-sm">
      <p className="text-sm font-medium">Workspace Trust</p>
      <p className="text-xs text-muted-foreground">
        In nicht vertrauenswürdigen Ordnern läuft der eingeschränkte Modus (Terminal deaktiviert).
      </p>
      {rootPath && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
          <span className="min-w-0">
            <span
              className={cn(
                "font-medium",
                trusted ? "text-emerald-600 dark:text-emerald-500" : "text-amber-600 dark:text-amber-500",
              )}
            >
              {trusted ? "Vertraut" : "Eingeschränkt"}
            </span>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {rootPath}
            </span>
          </span>
          {!trusted && (
            <Button type="button" size="sm" variant="secondary" onClick={() => trustFolder(rootPath)}>
              Vertrauen
            </Button>
          )}
        </div>
      )}
      <ul className="mt-2 space-y-1">
        {trustedFolders.map((path) => (
          <li
            key={path}
            className="flex items-center justify-between rounded border px-2 py-1 text-sm"
          >
            <span className="truncate font-mono text-xs">{path}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => revokeTrust(path)}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const EMPTY: string[] = [];

function HiddenList({
  scope,
  title,
  description,
}: {
  scope: HiddenScope;
  title: string;
  description: string;
}) {
  const names = useWorkspaceStore(
    (s) =>
      (scope === "global"
        ? s.hiddenNames
        : s.rootPath
          ? s.workspaceHidden[s.rootPath]
          : undefined) ?? EMPTY,
  );
  const hideName = useWorkspaceStore((s) => s.hideName);
  const unhideName = useWorkspaceStore((s) => s.unhideName);
  const [value, setValue] = useState("");

  return (
    <div className="mt-4 max-w-sm">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = value.trim();
          if (name) hideName(name, scope);
          setValue("");
        }}
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z.B. node_modules"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="secondary">
          Hinzufügen
        </Button>
      </form>
      <ul className="mt-2 space-y-1">
        {names.map((name) => (
          <li
            key={name}
            className="flex items-center justify-between rounded border px-2 py-1 text-sm"
          >
            <span className="truncate font-mono">{name}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={() => unhideName(name, scope)}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
