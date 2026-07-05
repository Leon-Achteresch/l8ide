import { createFileRoute } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { PrettierSettings } from "@/components/prettier-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  useEditorSettings,
  type WhitespaceRender,
} from "@/lib/editor-settings";
import { useUiZoom } from "@/lib/ui-zoom";
import { type TabSizing, useViewStore } from "@/lib/view-store";
import { useRefactorSettings } from "@/lib/ts-refactor";
import { useTailwindSettings } from "@/lib/tailwind";
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
  const tabSizing = useViewStore((s) => s.tabSizing);
  const setTabSizing = useViewStore((s) => s.setTabSizing);
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
      <div className="mt-4 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium">Tab-Größe</p>
          <p className="text-xs text-muted-foreground">
            Tabs verkleinern oder mit fester Breite anzeigen
          </p>
        </div>
        <NativeSelect
          size="sm"
          value={tabSizing}
          onChange={(e) => setTabSizing(e.target.value as TabSizing)}
        >
          <NativeSelectOption value="shrink">Verkleinern</NativeSelectOption>
          <NativeSelectOption value="fixed">Feste Breite</NativeSelectOption>
        </NativeSelect>
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
      <EditorDisplaySettings />
      <RefactorSettings />
      <TailwindSettings />
      <PrettierSettings />
    </div>
  );
}

const WHITESPACE_OPTIONS: WhitespaceRender[] = [
  "none",
  "boundary",
  "trailing",
  "selection",
  "all",
];

function DisplayRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div>
        <p className="text-sm">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function EditorDisplaySettings() {
  const s = useEditorSettings();
  const uiZoom = useUiZoom((z) => z.zoom);
  const zoomIn = useUiZoom((z) => z.zoomIn);
  const zoomOut = useUiZoom((z) => z.zoomOut);
  const zoomReset = useUiZoom((z) => z.reset);

  return (
    <div className="mt-8 max-w-sm">
      <p className="text-sm font-medium">Editor: Darstellung</p>
      <p className="text-xs text-muted-foreground">
        Anzeigeoptionen für den Code-Editor
      </p>
      <div className="mt-2 space-y-1">
        <DisplayRow label="Semantische Hervorhebung">
          <Switch
            checked={s.semanticHighlighting}
            onCheckedChange={s.setSemanticHighlighting}
          />
        </DisplayRow>

        <DisplayRow label="Sticky Scroll">
          <Switch
            checked={s.stickyScroll}
            onCheckedChange={s.setStickyScroll}
          />
        </DisplayRow>

        <DisplayRow label="Breadcrumbs">
          <Switch checked={s.breadcrumbs} onCheckedChange={s.setBreadcrumbs} />
        </DisplayRow>

        <DisplayRow label="Zeilenumbruch (Word Wrap)">
          <Switch checked={s.wordWrap} onCheckedChange={s.setWordWrap} />
        </DisplayRow>

        <DisplayRow
          label="Umbruchspalte"
          description="0 = Editorbreite"
        >
          <Input
            type="number"
            min={0}
            max={400}
            value={s.wordWrapColumn}
            onChange={(e) => s.setWordWrapColumn(Number(e.target.value))}
            className="h-8 w-20"
          />
        </DisplayRow>

        <DisplayRow label="Font-Ligaturen">
          <Switch
            checked={s.fontLigatures}
            onCheckedChange={s.setFontLigatures}
          />
        </DisplayRow>

        <DisplayRow
          label="Rulers (Spalten)"
          description="Kommagetrennt, z.B. 80, 120"
        >
          <Input
            value={s.rulers.join(", ")}
            onChange={(e) =>
              s.setRulers(
                e.target.value
                  .split(",")
                  .map((n) => Math.round(Number(n.trim())))
                  .filter((n) => Number.isFinite(n) && n > 0),
              )
            }
            placeholder="80, 120"
            className="h-8 w-24"
          />
        </DisplayRow>

        <DisplayRow label="Farbvorschau (Color Decorators)">
          <Switch
            checked={s.colorDecorators}
            onCheckedChange={s.setColorDecorators}
          />
        </DisplayRow>

        <DisplayRow
          label="Unicode-Warnungen"
          description="Verwechselbare/unsichtbare Zeichen"
        >
          <Switch
            checked={s.unicodeHighlight}
            onCheckedChange={s.setUnicodeHighlight}
          />
        </DisplayRow>

        <DisplayRow label="Whitespace anzeigen">
          <NativeSelect
            size="sm"
            value={s.renderWhitespace}
            onChange={(e) =>
              s.setRenderWhitespace(e.target.value as WhitespaceRender)
            }
          >
            {WHITESPACE_OPTIONS.map((o) => (
              <NativeSelectOption key={o} value={o}>
                {o}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </DisplayRow>

        <DisplayRow label="Steuerzeichen anzeigen">
          <Switch
            checked={s.renderControlCharacters}
            onCheckedChange={s.setRenderControlCharacters}
          />
        </DisplayRow>

        <DisplayRow
          label="UI-Zoom"
          description="Gesamte Oberfläche skalieren"
        >
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-7"
              onClick={zoomOut}
            >
              −
            </Button>
            <button
              type="button"
              onClick={zoomReset}
              className="w-12 text-center text-xs tabular-nums text-muted-foreground hover:text-foreground"
            >
              {Math.round(uiZoom * 100)}%
            </button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-7"
              onClick={zoomIn}
            >
              +
            </Button>
          </div>
        </DisplayRow>
      </div>
    </div>
  );
}

function RefactorSettings() {
  const organizeImportsOnSave = useRefactorSettings(
    (s) => s.organizeImportsOnSave,
  );
  const setOrganizeImportsOnSave = useRefactorSettings(
    (s) => s.setOrganizeImportsOnSave,
  );

  return (
    <div className="mt-8 max-w-sm">
      <p className="text-sm font-medium">Refactoring</p>
      <p className="text-xs text-muted-foreground">
        Code-Aktionen für TypeScript/JavaScript (Cmd+.)
      </p>
      <div className="mt-2 flex items-center justify-between gap-4 py-1.5">
        <div>
          <p className="text-sm">Imports beim Speichern organisieren</p>
          <p className="text-xs text-muted-foreground">
            Ungenutzte entfernen und sortieren (Auto Fix on Save)
          </p>
        </div>
        <Switch
          checked={organizeImportsOnSave}
          onCheckedChange={setOrganizeImportsOnSave}
        />
      </div>
    </div>
  );
}

function TailwindSettings() {
  const s = useTailwindSettings();
  return (
    <div className="mt-8 max-w-sm">
      <p className="text-sm font-medium">Tailwind CSS</p>
      <p className="text-xs text-muted-foreground">
        Autovervollständigung, Vorschau, Sortierung und Linting für
        Utility-Klassen
      </p>
      <div className="mt-2 space-y-1">
        <DisplayRow
          label="Aktiviert"
          description="Vorschläge, Hover-Vorschau und Farbfelder"
        >
          <Switch checked={s.enabled} onCheckedChange={s.setEnabled} />
        </DisplayRow>
        <DisplayRow
          label="Klassen beim Formatieren sortieren"
          description="Reihenfolge wie prettier-plugin-tailwindcss"
        >
          <Switch checked={s.sortClasses} onCheckedChange={s.setSortClasses} />
        </DisplayRow>
        <DisplayRow
          label="Linting"
          description="Kollidierende Klassen und unbekannte @apply-Utilities"
        >
          <Switch checked={s.lint} onCheckedChange={s.setLint} />
        </DisplayRow>
      </div>
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
