import { SearchMatchPreview } from "@/components/search-panel/search-match-preview";
import { fileIcon } from "@/lib/file-icons";
import { openFileAt } from "@/lib/monaco-navigation";
import { useSearchStore, type FileMatches } from "@/lib/search-store";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  File,
  Replace,
  ReplaceAll,
  X,
} from "lucide-react";

export function SearchFileGroup({
  file,
  rootPath,
  showReplace,
}: {
  file: FileMatches;
  rootPath: string;
  showReplace: boolean;
}) {
  const collapsed = useSearchStore((s) => Boolean(s.collapsed[file.path]));
  const toggleCollapsed = useSearchStore((s) => s.toggleCollapsed);
  const dismissFile = useSearchStore((s) => s.dismissFile);
  const dismissMatch = useSearchStore((s) => s.dismissMatch);
  const replaceFile = useSearchStore((s) => s.replaceFile);
  const replaceOne = useSearchStore((s) => s.replaceOne);
  const replaceValue = useSearchStore((s) => s.replaceValue);
  const replacing = useSearchStore((s) => s.replacing);

  const name = file.path.split("/").pop() ?? file.path;
  const dir = file.path.startsWith(`${rootPath}/`)
    ? file.path.slice(rootPath.length + 1, file.path.lastIndexOf("/"))
    : "";
  const Icon = fileIcon(name) ?? File;

  return (
    <div className="py-px">
      <div
        className={cn(
          "group flex w-full items-center gap-0.5 rounded-md px-1 py-0.5",
          "hover:bg-sidebar-accent",
        )}
      >
        <button
          type="button"
          onClick={() => toggleCollapsed(file.path)}
          className="flex min-w-0 flex-1 items-start gap-1.5 py-0.5 pl-0.5 text-left"
        >
          {collapsed ? (
            <ChevronRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
          )}
          <Icon className="mt-0.5 size-3.5 shrink-0 opacity-80" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium leading-tight">
              {name}
            </span>
            {dir && (
              <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                {dir}
              </span>
            )}
          </span>
        </button>
        <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground group-hover:hidden">
          {file.matches.length}
        </span>
        <span className="hidden shrink-0 items-center group-hover:flex">
          {showReplace && (
            <button
              type="button"
              title="Alle im Ordner ersetzen"
              disabled={replacing}
              onClick={() => void replaceFile(rootPath, file.path)}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground disabled:opacity-40"
            >
              <ReplaceAll className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Verwerfen"
            onClick={() => dismissFile(file.path)}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </div>
      {!collapsed && (
        <div className="ml-[18px] border-l border-sidebar-border pl-1.5">
          {file.matches.map((match, i) => (
            <div
              key={`${match.line}:${match.column}:${i}`}
              className="group/match flex items-center gap-1 rounded-md hover:bg-sidebar-accent"
            >
              <button
                type="button"
                onClick={() =>
                  openFileAt(file.path, {
                    line: match.line,
                    column: match.column + 1,
                    endColumn: match.column + match.length + 1,
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-2 py-0.5 pl-1 text-left"
              >
                <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground/80">
                  {match.line}
                </span>
                <SearchMatchPreview
                  match={match}
                  replaceValue={
                    showReplace && replaceValue ? replaceValue : null
                  }
                />
              </button>
              <span className="hidden shrink-0 items-center pr-0.5 group-hover/match:flex">
                {showReplace && (
                  <button
                    type="button"
                    title="Ersetzen"
                    disabled={replacing}
                    onClick={() => void replaceOne(rootPath, file.path, match)}
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground disabled:opacity-40"
                  >
                    <Replace className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Verwerfen"
                  onClick={() => dismissMatch(file.path, match)}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
