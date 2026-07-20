import { SearchFileGroup } from "@/components/search-panel/search-file-group";
import { SearchFilenameGroup } from "@/components/search-panel/search-filename-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { useFileIndexStore } from "@/lib/file-index";
import { useSearchEditor } from "@/lib/search-editor-store";
import {
  useSearchStore,
} from "@/lib/search-store";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";
import {
  CaseSensitive,
  ChevronRight,
  FileDiff,
  FileOutput,
  Loader2,
  PanelTop,
  Regex,
  ReplaceAll,
  Search,
  SlidersHorizontal,
  WholeWord,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef } from "react";

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
  const noIgnore = useSearchStore((s) => s.noIgnore);
  const toggleNoIgnore = useSearchStore((s) => s.toggleNoIgnore);
  const openOnly = useSearchStore((s) => s.openOnly);
  const toggleOpenOnly = useSearchStore((s) => s.toggleOpenOnly);
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

  const deferredQuery = useDeferredValue(query);
  const nameHits = useMemo(
    () =>
      filenameMatches(
        indexedFiles,
        deferredQuery,
        caseSensitive,
        wholeWord,
        useRegex,
      ),
    [indexedFiles, deferredQuery, caseSensitive, wholeWord, useRegex],
  );

  const busy = searching || replacing;
  const hasContent = query.trim().length > 0;
  const noResults =
    searched && hasContent && total === 0 && nameHits.length === 0 && !error;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-1.5 border-b border-sidebar-border px-2 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            title="Ersetzen ein-/ausblenden"
            aria-expanded={showReplace}
            onClick={toggleShowReplace}
            className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3.5 transition-transform duration-150",
                showReplace && "rotate-90",
              )}
            />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <InputGroup className="h-7 shadow-none">
              <InputGroupInput
                id={SEARCH_INPUT_ID}
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen"
                spellCheck={false}
                className="h-7 text-xs"
              />
              {busy && (
                <InputGroupAddon align="inline-end" className="pr-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                </InputGroupAddon>
              )}
            </InputGroup>

            {showReplace && (
              <InputGroup className="h-7 shadow-none">
                <InputGroupInput
                  value={replaceValue}
                  onChange={(e) => setReplaceValue(e.target.value)}
                  placeholder="Ersetzen"
                  spellCheck={false}
                  className="h-7 text-xs"
                />
                <InputGroupAddon align="inline-end" className="pr-0.5">
                  <InputGroupButton
                    size="icon-xs"
                    title="Ersetzen mit Vorschau"
                    disabled={files.length === 0 || replacing}
                    onClick={() =>
                      void useSearchStore.getState().previewReplaceAll()
                    }
                  >
                    <FileDiff className="size-3.5" />
                  </InputGroupButton>
                  <InputGroupButton
                    size="icon-xs"
                    title="Alle ersetzen"
                    disabled={files.length === 0 || replacing}
                    onClick={() => void replaceAll(rootPath)}
                  >
                    <ReplaceAll className="size-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            )}
          </div>
        </div>

        <div className="ml-7 flex items-center gap-0.5">
          <Toggle
            size="sm"
            variant="outline"
            pressed={caseSensitive}
            onPressedChange={() => toggleCaseSensitive()}
            title="Groß-/Kleinschreibung beachten"
            className="size-6 min-w-6 p-0"
          >
            <CaseSensitive className="size-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={wholeWord}
            onPressedChange={() => toggleWholeWord()}
            title="Nur ganzes Wort"
            className="size-6 min-w-6 p-0"
          >
            <WholeWord className="size-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={useRegex}
            onPressedChange={() => toggleRegex()}
            title="Regulären Ausdruck verwenden"
            className="size-6 min-w-6 p-0"
          >
            <Regex className="size-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={openOnly}
            onPressedChange={() => toggleOpenOnly()}
            title="Nur in geöffneten Editoren suchen"
            className="size-6 min-w-6 p-0"
          >
            <PanelTop className="size-3.5" />
          </Toggle>

          <button
            type="button"
            title="Dateifilter"
            aria-expanded={showFilters}
            onClick={toggleShowFilters}
            className={cn(
              "ml-auto inline-flex size-6 items-center justify-center rounded-md border border-transparent transition-colors",
              showFilters
                ? "border-input bg-muted text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            )}
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </div>

        {showFilters && (
          <div className="ml-7 space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Einzuschließen
              </span>
              <input
                value={include}
                placeholder="z. B. src/**/*.ts"
                onChange={(e) => setInclude(e.target.value)}
                spellCheck={false}
                className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground">
                Ausschließen
              </span>
              <input
                value={exclude}
                placeholder="z. B. dist, *.min.js"
                onChange={(e) => setExclude(e.target.value)}
                spellCheck={false}
                className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground">
                .gitignore ignorieren
              </span>
              <Switch checked={noIgnore} onCheckedChange={toggleNoIgnore} />
            </label>
          </div>
        )}
      </div>

      {(error || searched) && (
        <div className="shrink-0 px-3 py-1.5">
          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {total > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {total} Treffer
                </Badge>
              )}
              {files.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  in {files.length}{" "}
                  {files.length === 1 ? "Datei" : "Dateien"}
                </span>
              )}
              {files.length > 0 && (
                <button
                  type="button"
                  title="Ergebnisse als Editor-Tab öffnen (bleibt bei neuer Suche erhalten)"
                  onClick={() => {
                    const s = useSearchStore.getState();
                    useSearchEditor.getState().openSnapshot({
                      query: s.query,
                      total: s.total,
                      files: s.files,
                      time: Date.now(),
                    });
                  }}
                  className="inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  <FileOutput className="size-3" />
                  Als Tab
                </button>
              )}
              {total === 0 && nameHits.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {nameHits.length} Dateinamen-Treffer
                </span>
              )}
              {noResults && (
                <span className="text-[10px] text-muted-foreground">
                  Keine Ergebnisse
                </span>
              )}
              {truncated && (
                <span className="text-[10px] text-muted-foreground">
                  · begrenzt
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 pt-1">
        {noResults ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Search className="size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Keine Treffer für „{query.trim()}“
            </p>
          </div>
        ) : (
          <>
            <SearchFilenameGroup paths={nameHits} rootPath={rootPath} />
            {files.map((file) => (
              <SearchFileGroup
                key={file.path}
                file={file}
                rootPath={rootPath}
                showReplace={showReplace}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
