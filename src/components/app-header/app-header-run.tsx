import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  detectPackageManager,
  readScripts,
  scriptCommand,
  type PackageManager,
  type Script,
} from "@/lib/run-scripts";
import { useIsWorkspaceTrusted, useWorkspaceStore } from "@/lib/workspace-store";
import { Play } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useState } from "react";

export function AppHeaderRun() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const trusted = useIsWorkspaceTrusted();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [pm, setPm] = useState<PackageManager>("npm");

  const load = useCallback(async () => {
    if (!rootPath) {
      setScripts([]);
      return;
    }
    const [list, manager] = await Promise.all([
      readScripts(rootPath),
      detectPackageManager(rootPath),
    ]);
    setScripts(list);
    setPm(manager);
  }, [rootPath]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!rootPath || scripts.length === 0) return null;

  return (
    <div style={{ WebkitAppRegion: "no-drag" } as CSSProperties}>
      <DropdownMenu onOpenChange={(open) => open && void load()}>
        <DropdownMenuTrigger
          disabled={!trusted}
          title={trusted ? "Skript ausführen" : "Ordner vertrauen, um Skripte auszuführen"}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-green-600 transition-colors duration-150 hover:bg-green-500/12 hover:text-green-500 disabled:pointer-events-none disabled:opacity-40 dark:text-green-500"
        >
          <Play className="size-4" strokeWidth={2} fill="currentColor" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Skripte · {pm}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {scripts.map((s) => (
              <DropdownMenuItem
                key={s.name}
                onClick={() =>
                  void import("@/lib/terminal").then((m) =>
                    m.runInTerminal(scriptCommand(pm, s.name)),
                  )
                }
                className="flex-col items-start gap-0"
              >
                <span className="font-medium">{s.name}</span>
                <span className="w-full truncate text-[11px] text-muted-foreground">
                  {s.command}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
