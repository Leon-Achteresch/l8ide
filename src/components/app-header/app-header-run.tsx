import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  detectPackageManager,
  PACKAGE_MANAGERS,
  preferredScript,
  readScripts,
  scriptCommand,
  type PackageManager,
  type Script,
} from "@/lib/run-scripts";
import { useIsWorkspaceTrusted, useWorkspaceStore } from "@/lib/workspace-store";
import { Check, ChevronDown, Play } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type RunChoice = { script: string; manager: PackageManager };

function storageKey(root: string) {
  return `l8ide:run:${root}`;
}

function savedChoice(root: string): Partial<RunChoice> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(root)) ?? "{}") as Partial<RunChoice>;
  } catch {
    return {};
  }
}

export function AppHeaderRun() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const trusted = useIsWorkspaceTrusted();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [choice, setChoice] = useState<RunChoice | null>(null);

  const load = useCallback(async () => {
    if (!rootPath) {
      setScripts([]);
      setChoice(null);
      return;
    }
    const [list, detected] = await Promise.all([
      readScripts(rootPath),
      detectPackageManager(rootPath),
    ]);
    const saved = savedChoice(rootPath);
    const script = preferredScript(list, saved.script);
    setScripts(list);
    setChoice(script ? {
      script,
      manager: PACKAGE_MANAGERS.includes(saved.manager as PackageManager)
        ? saved.manager as PackageManager
        : detected,
    } : null);
  }, [rootPath]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!rootPath) return;
    const onSave = (event: Event) => {
      if ((event as CustomEvent<string>).detail === `${rootPath}/package.json`) void load();
    };
    window.addEventListener("l8ide:file-saved", onSave);
    return () => window.removeEventListener("l8ide:file-saved", onSave);
  }, [rootPath, load]);

  const run = useCallback(async (selected: RunChoice) => {
    if (!rootPath || !trusted) return;
    try {
      const command = scriptCommand(selected.manager, selected.script);
      localStorage.setItem(storageKey(rootPath), JSON.stringify(selected));
      setChoice(selected);
      const { runInTerminal } = await import("@/lib/terminal");
      await runInTerminal(command, { newGroup: true });
    } catch (error) {
      toast.error(String(error));
    }
  }, [rootPath, trusted]);

  if (!rootPath) return null;

  return (
    <div className="flex items-center" style={{ WebkitAppRegion: "no-drag" } as CSSProperties}>
      <button
        type="button"
        disabled={!trusted || !choice}
        title={choice ? `${choice.manager} run ${choice.script}` : "Keine Skripte in package.json"}
        aria-label={choice ? `Projekt starten: ${choice.script}` : "Projekt starten"}
        onClick={() => choice && void run(choice)}
        className="inline-flex h-7 items-center gap-1 rounded-l-md px-1.5 text-green-600 hover:bg-green-500/12 disabled:pointer-events-none disabled:opacity-40 dark:text-green-500"
      >
        <Play className="size-4" strokeWidth={2} fill="currentColor" />
        {choice && <span className="max-w-24 truncate text-xs">{choice.script}</span>}
      </button>
      <DropdownMenu onOpenChange={(open) => open && void load()}>
        <DropdownMenuTrigger
          disabled={!trusted}
          title={trusted ? "Startbefehl auswählen" : "Ordner vertrauen, um Skripte auszuführen"}
          aria-label="Startbefehl auswählen"
          className="inline-flex h-7 w-5 items-center justify-center rounded-r-md text-green-600 hover:bg-green-500/12 disabled:pointer-events-none disabled:opacity-40 dark:text-green-500"
        >
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>package.json · {choice?.manager ?? "npm"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {scripts.length === 0 ? (
              <DropdownMenuLabel>Keine Skripte gefunden</DropdownMenuLabel>
            ) : scripts.map((script) => (
              <DropdownMenuItem
                key={script.name}
                onClick={() => void run({ script: script.name, manager: choice?.manager ?? "npm" })}
                className="flex-col items-start gap-0"
              >
                <span className="flex w-full items-center justify-between font-medium">
                  {script.name}
                  {choice?.script === script.name && <Check className="size-3.5" />}
                </span>
                <span className="w-full truncate text-[11px] text-muted-foreground">{script.command}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Paketmanager · {choice?.manager ?? "npm"}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PACKAGE_MANAGERS.map((manager) => (
                  <DropdownMenuItem key={manager} onClick={() => {
                    if (!rootPath || !choice) return;
                    const next = { ...choice, manager };
                    localStorage.setItem(storageKey(rootPath), JSON.stringify(next));
                    setChoice(next);
                  }}>
                    {manager}
                    {choice?.manager === manager && <Check className="ml-auto size-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
