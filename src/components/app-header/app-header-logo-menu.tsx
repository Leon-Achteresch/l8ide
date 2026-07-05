import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { redoActive, saveActiveFile, undoActive } from "@/lib/editor-actions";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { open } from "@tauri-apps/plugin-dialog";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  AppWindow,
  ChevronRight,
  FileText,
  FolderOpen,
  History,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { AppHeaderMenuAction } from "./app-header-menu-action";
import {
  AUTOSAVE_DELAYS,
  MENU_CONTAINER,
  MENU_ITEM,
  MENU_SPRING,
  SIDEBAR_TAB_SPRING,
} from "./constants";

function newWindow() {
  new WebviewWindow(`w-${Date.now()}`, {
    url: "/",
    title: "l8ide",
    width: 800,
    height: 600,
    titleBarStyle: "overlay",
    hiddenTitle: true,
    trafficLightPosition: new LogicalPosition(19, 23),
  });
}

async function openFolder() {
  const selected = await open({ directory: true, multiple: false });
  if (typeof selected === "string")
    useWorkspaceStore.getState().setRootPath(selected);
}

async function openFile() {
  const selected = await open({ directory: false, multiple: false });
  if (typeof selected === "string")
    useWorkspaceStore.getState().openFile(selected);
}

export function AppHeaderLogoMenu() {
  const autoSave = useWorkspaceStore((s) => s.autoSave);
  const setAutoSave = useWorkspaceStore((s) => s.setAutoSave);
  const autoSaveDelay = useWorkspaceStore((s) => s.autoSaveDelay);
  const setAutoSaveDelay = useWorkspaceStore((s) => s.setAutoSaveDelay);
  const recentFolders = useWorkspaceStore((s) => s.recentFolders);
  const setRootPath = useWorkspaceStore((s) => s.setRootPath);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const logoSrc =
    resolvedTheme === "dark" ? "/logo_black.png" : "/logo_white.png";

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger
        render={
          <motion.button
            type="button"
            aria-label="Menü"
            title="Menü"
            animate={{ scale: menuOpen ? 0.94 : 1 }}
            whileHover={{ scale: menuOpen ? 0.94 : 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 28 }}
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150",
              "hover:bg-foreground/8 hover:text-foreground",
              "data-popup-open:bg-foreground/10 data-popup-open:text-foreground",
            )}
          >
            <motion.img
              src={logoSrc}
              alt="Logo"
              animate={{ opacity: menuOpen ? 1 : 0.9, rotate: menuOpen ? -4 : 0 }}
              transition={MENU_SPRING}
              className="h-8 w-auto"
            />
          </motion.button>
        }
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-56 gap-0 overflow-hidden border-t-none p-0 data-closed:animate-none data-open:animate-none"
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={MENU_CONTAINER}
        >
          <motion.div
            variants={MENU_ITEM}
            className="flex flex-col gap-3 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium">AutoSave</p>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Automatisch speichern
                </p>
              </div>
              <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            </div>

            <AnimatePresence initial={false}>
              {autoSave ? (
                <motion.div
                  key="autosave-delay"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={MENU_SPRING}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                      Verzögerung
                    </p>
                    <div className="relative inline-flex h-7 items-center self-start rounded-lg bg-foreground/[0.05] p-0.5 ring-1 ring-foreground/[0.04]">
                      {AUTOSAVE_DELAYS.map((ms) => {
                        const active = autoSaveDelay === ms;
                        return (
                          <motion.button
                            key={ms}
                            type="button"
                            onClick={() => setAutoSaveDelay(ms)}
                            whileTap={{ scale: 0.94 }}
                            transition={{
                              type: "spring",
                              stiffness: 600,
                              damping: 30,
                            }}
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
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={MENU_ITEM}
            className="border-t border-border/60 p-1"
          >
            <AppHeaderMenuAction
              icon={AppWindow}
              label="Neues Fenster"
              onClick={newWindow}
            />
            <AppHeaderMenuAction
              icon={FileText}
              label="Datei öffnen"
              onClick={openFile}
            />
            <AppHeaderMenuAction
              icon={FolderOpen}
              label="Ordner öffnen"
              shortcut="Mod+O"
              onClick={openFolder}
            />
            <motion.button
              type="button"
              variants={MENU_ITEM}
              onClick={() => setRecentOpen((v) => !v)}
              disabled={recentFolders.length === 0}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              title="Zuletzt geöffnet"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <History className="size-3.5 shrink-0" strokeWidth={2} />
              <span className="min-w-0 flex-1 text-xs font-medium">
                Zuletzt geöffnet
              </span>
              <motion.span
                animate={{ rotate: recentOpen ? 90 : 0 }}
                transition={MENU_SPRING}
                className="inline-flex shrink-0"
              >
                <ChevronRight className="size-3.5" strokeWidth={2} />
              </motion.span>
            </motion.button>
            <AnimatePresence initial={false}>
              {recentOpen ? (
                <motion.div
                  key="recent-folders"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={MENU_SPRING}
                  className="overflow-hidden"
                >
                  {recentFolders.map((path, index) => (
                    <motion.button
                      key={path}
                      type="button"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{
                        ...MENU_SPRING,
                        delay: index * 0.035,
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRootPath(path)}
                      title={path}
                      className="flex w-full items-center gap-2 rounded-md py-1 pr-2 pl-8 text-left text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px]">
                        {path.split("/").pop() || path}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <motion.div
            variants={MENU_ITEM}
            className="border-t border-border/60 p-1"
          >
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
          </motion.div>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
