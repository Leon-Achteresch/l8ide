import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  redoActive,
  saveActiveFile,
  undoActive,
} from "@/lib/editor-actions";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Redo2, Save, Undo2 } from "lucide-react";
import { useTheme } from "next-themes";
import { AppHeaderMenuAction } from "./app-header-menu-action";
import { AUTOSAVE_DELAYS } from "./constants";

export function AppHeaderLogoMenu() {
  const autoSave = useWorkspaceStore((s) => s.autoSave);
  const setAutoSave = useWorkspaceStore((s) => s.setAutoSave);
  const autoSaveDelay = useWorkspaceStore((s) => s.autoSaveDelay);
  const setAutoSaveDelay = useWorkspaceStore((s) => s.setAutoSaveDelay);
  const { resolvedTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Menü"
            title="Menü"
            className="inline-flex shrink-0 items-center rounded-md px-1 py-0.5 transition-colors hover:bg-foreground/8"
          >
            <img
              src={
                resolvedTheme === "dark"
                  ? "/logo_black.png"
                  : "/logo_white.png"
              }
              alt="Logo"
              className="h-5 w-auto opacity-90"
            />
          </button>
        }
      />
      <PopoverContent align="start" className="w-64 gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">AutoSave</p>
            <p className="text-xs text-muted-foreground">
              Änderungen automatisch speichern
            </p>
          </div>
          <Switch checked={autoSave} onCheckedChange={setAutoSave} />
        </div>

        {autoSave && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Verzögerung</p>
            <div className="inline-flex rounded-md bg-foreground/[0.05] p-0.5 ring-1 ring-foreground/[0.06]">
              {AUTOSAVE_DELAYS.map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setAutoSaveDelay(ms)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                    autoSaveDelay === ms
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border/60" aria-hidden />

        <div className="grid grid-cols-3 gap-1.5">
          <AppHeaderMenuAction icon={Save} label="Speichern" onClick={saveActiveFile} />
          <AppHeaderMenuAction icon={Undo2} label="Rückgängig" onClick={undoActive} />
          <AppHeaderMenuAction icon={Redo2} label="Wiederholen" onClick={redoActive} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
