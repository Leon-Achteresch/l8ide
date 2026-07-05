import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { redoActive, saveActiveFile, undoActive } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Redo2, Save, Undo2 } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { AppHeaderMenuAction } from "./app-header-menu-action";
import { AUTOSAVE_DELAYS, SIDEBAR_TAB_SPRING } from "./constants";

export function AppHeaderLogoMenu() {
  const autoSave = useWorkspaceStore((s) => s.autoSave);
  const setAutoSave = useWorkspaceStore((s) => s.setAutoSave);
  const autoSaveDelay = useWorkspaceStore((s) => s.autoSaveDelay);
  const setAutoSaveDelay = useWorkspaceStore((s) => s.setAutoSaveDelay);
  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === "dark" ? "/logo_black.png" : "/logo_white.png";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Menü"
            title="Menü"
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150",
              "hover:bg-foreground/8 hover:text-foreground",
              "data-popup-open:bg-foreground/10 data-popup-open:text-foreground",
            )}
          >
            <img src={logoSrc} alt="Logo" className="h-8 w-auto opacity-90" />
          </button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-56 gap-0 overflow-hidden p-0 border-t-none"
      >
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium">AutoSave</p>
              <p className="text-[11px] leading-4 text-muted-foreground">
                Automatisch speichern
              </p>
            </div>
            <Switch checked={autoSave} onCheckedChange={setAutoSave} />
          </div>

          {autoSave ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                Verzögerung
              </p>
              <div className="relative inline-flex h-7 items-center self-start rounded-lg bg-foreground/[0.05] p-0.5 ring-1 ring-foreground/[0.04]">
                {AUTOSAVE_DELAYS.map((ms) => {
                  const active = autoSaveDelay === ms;
                  return (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => setAutoSaveDelay(ms)}
                      className={cn(
                        "relative z-10 rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-150",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <motion.span
                          layoutId="autosave-delay-indicator"
                          transition={SIDEBAR_TAB_SPRING}
                          className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm ring-1 ring-foreground/8"
                          aria-hidden
                        />
                      ) : null}
                      {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 p-1">
          <AppHeaderMenuAction
            icon={Save}
            label="Speichern"
            shortcut="Mod+S"
            onClick={saveActiveFile}
          />
          <AppHeaderMenuAction
            icon={Undo2}
            label="Rückgängig"
            shortcut="Mod+Z"
            onClick={undoActive}
          />
          <AppHeaderMenuAction
            icon={Redo2}
            label="Wiederholen"
            shortcut="Mod+Shift+Z"
            onClick={redoActive}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
