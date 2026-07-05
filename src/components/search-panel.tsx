import { fileIcon } from "@/lib/file-icons";
import { useFileIndexStore } from "@/lib/file-index";
import { openFileAt } from "@/lib/monaco-navigation";
import {
  useSearchStore,
  type FileMatches,
  type SearchMatch,
} from "@/lib/search-store";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  File,
  Loader2,
  Regex,
  Replace,
  ReplaceAll,
  SlidersHorizontal,
  WholeWord,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const SEARCH_INPUT_ID = "workspace-search-input";

const MAX_FILENAME_RESULTS = 50;

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function filenameMatches(
  files: string[],
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  useRegex: boolean,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let re: RegExp;
  try {
    const base = useRegex ? trimmed : escapeRegExp(trimmed);
    re = new RegExp(
      wholeWord ? `\\b(?:${base})\\b` : base,
      caseSensitive ? "" : "i",
    );
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const path of files) {
    const name = path.split("/").pop() ?? path;
    if (re.test(name)) {
      out.push(path);
      if (out.length >= MAX_FILENAME_RESULTS) break;
    }
  }
  return out;
}

function OptionToggle({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-100",
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </button>
  );
}

function FilterInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full rounded-md bg-foreground/[0.05] px-2 py-1 text-xs outline-none ring-1 ring-foreground/[0.06] transition-shadow placeholder:text-muted-foreground/60 focus:ring-primary/40"
      />
    </label>
  );
}

function MatchPreview({
  match,
  replaceValue,
}: {
  match: SearchMatch;
  replaceValue: string | null;
}) {
  const chars = Array.from(match.preview);
  const start = Math.min(match.column, chars.length);
  const end = Math.min(match.column + match.length, chars.length);
  const windowStart = start > 30 ? start - 20 : 0;
  return (
    <span className="min-w-0 flex-1 truncate font-mono text-[11px] leading-5 text-muted-foreground">
      {windowStart > 0 && <span className="opacity-50">…</span>}
      {chars.slice(windowStart, start).join("")}
      <span
        className={cn(
          "rounded-[3px] px-px text-foreground",
          replaceValue !== null
            ? "bg-destructive/15 line-through decoration-destructive/70"
            : "bg-amber-400/30 dark:bg-amber-300/20",
        )}
      >
        {chars.slice(start, end).join("")}
      </span>
      {replaceValue !== null && (
        <span className="rounded-[3px] bg-emerald-500/15 px-px text-foreground">
          {replaceValue}
        </span>
      )}
      {chars.slice(end).join("")}
    </span>
  );
}

function FileGroup({
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
    ? file.path.slice(rootPath.length + 1, file.path.lastIndexOf("/") + 1)
    : "";
  const Icon = fileIcon(name) ?? File;

  return (
    <div>
      <div className="group flex w-full items-center gap-1 rounded-md px-1.5 py-1 hover:bg-foreground/[0.06]">
        <button
          type="button"
          onClick={() => toggleCollapsed(file.path)}
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          {collapsed ? (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          )}
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate text-xs font-medium">{name}</span>
          {dir && (
            <span className="truncate text-[10px] text-muted-foreground">
              {dir}
            </span>
          )}
        </button>
        <span className="hidden items-center gap-0.5 group-hover:flex">
          {showReplace && (
            <button
              type="button"
              title="Alle im Ordner ersetzen"
              disabled={replacing}
              onClick={() => void replaceFile(rootPath, file.path)}
              className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-40"
            >
              <ReplaceAll className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Verwerfen"
            onClick={() => dismissFile(file.path)}
            className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </span>
        <span className="rounded-full bg-foreground/[0.07] px-1.5 py-px text-[10px] tabular-nums text-muted-foreground group-hover:hidden">
          {file.matches.length}
        </span>
      </div>
      {!collapsed && (
        <div className="ml-[13px] border-l border-border/60 pl-1">
          {file.matches.map((match, i) => (
            <div
              key={`${match.line}:${match.column}:${i}`}
              className="group/match flex items-center gap-1 rounded-md px-1.5 hover:bg-foreground/[0.06]"
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
                className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left"
              >
                <MatchPreview
                  match={match}
                  replaceValue={showReplace && replaceValue ? replaceValue : null}
                />
              </button>
              <span className="hidden items-center gap-0.5 group-hover/match:flex">
                {showReplace && (
                  <button
                    type="button"
                    title="Ersetzen"
                    disabled={replacing}
                    onClick={() => void replaceOne(rootPath, file.path, match)}
                    className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground disabled:opacity-40"
                  >
                    <Replace className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Verwerfen"
                  onClick={() => dismissMatch(file.path, match)}
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
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

function FilenameGroup({
  paths,
  rootPath,
}: {
  paths: string[];
  rootPath: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const openFile = useWorkspaceStore((s) => s.openFile);
  if (paths.length === 0) return null;
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left hover:bg-foreground/[0.06]"
      >
        {collapsed ? (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dateinamen
        </span>
        <span className="ml-auto rounded-full bg-foreground/[0.07] px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">
          {paths.length}
        </span>
      </button>
      {!collapsed && (
        <div className="ml-[13px] border-l border-border/60 pl-1">
          {paths.map((path) => {
            const name = path.split("/").pop() ?? path;
            const dir = path.startsWith(`${rootPath}/`)
              ? path.slice(rootPath.length + 1, path.lastIndexOf("/") + 1)
              : "";
            const Icon = fileIcon(name) ?? File;
            return (
              <button
                key={path}
                type="button"
                onClick={() => openFile(path)}
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left hover:bg-foreground/[0.06]"
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate text-xs">{name}</span>
                {dir && (
                  <span className="truncate text-[10px] text-muted-foreground">
                    {dir}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SearchPanel({ rootPath }: { rootPath: string }) {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const replaceValue = useSearchStore((s) => s.replaceValue);
  const setReplaceValue = useSearchStore((s) => s.setReplaceValue);
  const include = useSearchStore((s) => s.include);
  const setInclude = useSearchStore((s) => s.setInclude);
  const exclude = useSearchStore((s) => s.exclude);
  const setExclude = useSearchStore((s) => s.setExclude);
  const caseSensitive = useSearchStore((s) => s.caseSensitive);
  const wholeWord = useSearchStore((s) => s.wholeWord);
  const useRegex = useSearchStore((s) => s.useRegex);
  const toggleCaseSensitive = useSearchStore((s) => s.toggleCaseSensitive);
  const toggleWholeWord = useSearchStore((s) => s.toggleWholeWord);
  const toggleRegex = useSearchStore((s) => s.toggleRegex);
  const showReplace = useSearchStore((s) => s.showReplace);
  const toggleShowReplace = useSearchStore((s) => s.toggleShowReplace);
  const showFilters = useSearchStore((s) => s.showFilters);
  const toggleShowFilters = useSearchStore((s) => s.toggleShowFilters);
  const files = useSearchStore((s) => s.files);
  const total = useSearchStore((s) => s.total);
  const truncated = useSearchStore((s) => s.truncated);
  const searching = useSearchStore((s) => s.searching);
  const replacing = useSearchStore((s) => s.replacing);
  const searched = useSearchStore((s) => s.searched);
  const error = useSearchStore((s) => s.error);
  const search = useSearchStore((s) => s.search);
  const replaceAll = useSearchStore((s) => s.replaceAll);

  const hiddenNames = useWorkspaceStore((s) => s.hiddenNames);
  const workspaceHidden = useWorkspaceStore((s) => s.workspaceHidden);
  const indexedFiles = useFileIndexStore((s) => s.files);
  const ensureIndex = useFileIndexStore((s) => s.ensureIndex);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    ensureIndex(rootPath, hiddenNames, workspaceHidden[rootPath] ?? []);
  }, [rootPath, hiddenNames, workspaceHidden, ensureIndex]);

  useEffect(() => {
    const t = setTimeout(() => void search(rootPath), 250);
    return () => clearTimeout(t);
  }, [rootPath, query, caseSensitive, wholeWord, useRegex, include, exclude, search]);

  const nameHits = useMemo(
    () =>
      filenameMatches(indexedFiles, query, caseSensitive, wholeWord, useRegex),
    [indexedFiles, query, caseSensitive, wholeWord, useRegex],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Suche
        </span>
        {(searching || replacing) && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="flex gap-1 px-2">
        <button
          type="button"
          title="Ersetzen ein-/ausblenden"
          aria-expanded={showReplace}
          onClick={toggleShowReplace}
          className="flex w-4 shrink-0 items-center justify-center self-stretch rounded text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-150",
              showReplace && "rotate-90",
            )}
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1 rounded-md bg-foreground/[0.05] pr-1 ring-1 ring-foreground/[0.06] transition-shadow focus-within:ring-primary/40">
            <input
              id={SEARCH_INPUT_ID}
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60"
            />
            <OptionToggle
              icon={CaseSensitive}
              active={caseSensitive}
              onClick={toggleCaseSensitive}
              title="Groß-/Kleinschreibung beachten"
            />
            <OptionToggle
              icon={WholeWord}
              active={wholeWord}
              onClick={toggleWholeWord}
              title="Nur ganzes Wort"
            />
            <OptionToggle
              icon={Regex}
              active={useRegex}
              onClick={toggleRegex}
              title="Regulären Ausdruck verwenden"
            />
          </div>

          {showReplace && (
            <div className="flex items-center gap-1 rounded-md bg-foreground/[0.05] pr-1 ring-1 ring-foreground/[0.06] transition-shadow focus-within:ring-primary/40">
              <input
                value={replaceValue}
                onChange={(e) => setReplaceValue(e.target.value)}
                placeholder="Ersetzen"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                title="Alle ersetzen"
                disabled={files.length === 0 || replacing}
                onClick={() => void replaceAll(rootPath)}
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <ReplaceAll className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-2 pt-1.5">
        <button
          type="button"
          onClick={toggleShowFilters}
          aria-expanded={showFilters}
          className={cn(
            "ml-5 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors",
            showFilters
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3" />
          Filter
        </button>
        {showFilters && (
          <div className="ml-5 mt-1 flex flex-col gap-1.5 pb-1">
            <FilterInput
              label="Einzuschließende Dateien"
              value={include}
              placeholder="z. B. src/**/*.ts, *.css"
              onChange={setInclude}
            />
            <FilterInput
              label="Auszuschließende Dateien"
              value={exclude}
              placeholder="z. B. dist, *.min.js"
              onChange={setExclude}
            />
          </div>
        )}
      </div>

      <div className="px-3 pb-1 pt-1.5">
        {error ? (
          <p className="break-words text-[11px] text-destructive">{error}</p>
        ) : searched ? (
          <p className="text-[11px] text-muted-foreground">
            {total === 0
              ? nameHits.length > 0
                ? `${nameHits.length} Dateinamen-Treffer`
                : "Keine Ergebnisse"
              : `${total} Treffer in ${files.length} ${files.length === 1 ? "Datei" : "Dateien"}`}
            {truncated && " · Ergebnisse begrenzt"}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        <FilenameGroup paths={nameHits} rootPath={rootPath} />
        {files.map((file) => (
          <FileGroup
            key={file.path}
            file={file}
            rootPath={rootPath}
            showReplace={showReplace}
          />
        ))}
      </div>
    </div>
  );
}
