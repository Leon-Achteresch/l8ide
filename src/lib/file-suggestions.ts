type Entry = { count: number; last: number };
type ProjectHistory = {
  queries: Record<string, Entry>;
  files: Record<string, Entry>;
  choices: Record<string, Record<string, number>>;
};

const STORAGE_KEY = "l8-file-search-history-v1";
const MAX_PROJECTS = 12;
const MAX_QUERIES = 80;
const MAX_FILES = 150;

export function normalizeFileQuery(query: string) {
  return query.trim().toLocaleLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function readHistory(): Record<string, ProjectHistory> {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function trimEntries(entries: Record<string, Entry>, limit: number) {
  return Object.fromEntries(
    Object.entries(entries)
      .filter(([, entry]) => entry && Number.isFinite(entry.count) && Number.isFinite(entry.last))
      .sort((a, b) => b[1].last - a[1].last)
      .slice(0, limit),
  );
}

function update(root: string | null, change: (history: ProjectHistory) => void) {
  if (!root) return;
  try {
    const all = readHistory();
    const history = all[root] ?? { queries: {}, files: {}, choices: {} };
    history.queries ??= {};
    history.files ??= {};
    history.choices ??= {};
    change(history);
    history.queries = trimEntries(history.queries, MAX_QUERIES);
    history.files = trimEntries(history.files, MAX_FILES);
    history.choices = Object.fromEntries(
      Object.entries(history.choices)
        .filter(([query]) => query in history.queries)
        .map(([query, files]) => [query, Object.fromEntries(
          Object.entries(files).sort((a, b) => b[1] - a[1]).slice(0, 20),
        )]),
    );
    delete all[root];
    all[root] = history;
    const projects = Object.entries(all).slice(-MAX_PROJECTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(projects)));
  } catch {
    // Local history is optional when storage is unavailable.
  }
}

export function recordFileQuery(root: string | null, query: string) {
  const term = normalizeFileQuery(query);
  if (term.length < 2) return;
  update(root, (history) => {
    const previous = history.queries[term];
    history.queries[term] = { count: (previous?.count ?? 0) + 1, last: Date.now() };
  });
}

export function recordFileChoice(root: string | null, path: string, query: string) {
  update(root, (history) => {
    const previous = history.files[path];
    history.files[path] = { count: (previous?.count ?? 0) + 1, last: Date.now() };
    const term = normalizeFileQuery(query);
    if (term.length >= 2) {
      const previousQuery = history.queries[term];
      history.queries[term] = { count: (previousQuery?.count ?? 0) + 1, last: Date.now() };
      history.choices[term] ??= {};
      history.choices[term][path] = (history.choices[term][path] ?? 0) + 1;
    }
  });
}

export type FileSuggestionContext = {
  root: string | null;
  tabs?: string[];
  pinned?: string[];
  activeFile?: string | null;
  limit?: number;
  now?: number;
};

function fuzzyScore(query: string, value: string): number {
  let qi = 0;
  let score = 0;
  let streak = 0;
  const text = value.toLocaleLowerCase();
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] !== query[qi]) { streak = 0; continue; }
    streak++;
    score += 2 + streak * 2 + (i === 0 || "/._- ".includes(text[i - 1]!) ? 9 : 0);
    qi++;
  }
  return qi === query.length ? score : 0;
}

/** Rank only indexed files, so stale history never suggests deleted or hidden files. */
export function suggestFiles(files: string[], query: string, context: FileSuggestionContext): string[] {
  const term = normalizeFileQuery(query);
  const history = context.root ? readHistory()[context.root] : undefined;
  const now = context.now ?? Date.now();
  const tabs = new Set(context.tabs ?? []);
  const pinned = new Set(context.pinned ?? []);
  const activeDir = context.activeFile?.slice(0, context.activeFile.lastIndexOf("/"));
  const popularQueries = !term
    ? Object.entries(history?.queries ?? {}).sort((a, b) => b[1].count - a[1].count).slice(0, 8)
    : [];

  return files.map((path) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const nameScore = term ? fuzzyScore(term, name) : 0;
    const pathScore = term ? fuzzyScore(term, path) : 0;
    if (term && !nameScore && !pathScore) return { path, score: -1 };
    const usage = history?.files?.[path];
    const age = usage ? Math.max(0, now - usage.last) : Infinity;
    const recency = age < 86_400_000 ? 34 : age < 604_800_000 ? 21 : age < 2_592_000_000 ? 10 : 0;
    const frequency = usage ? Math.min(40, Math.log2(usage.count + 1) * 11) : 0;
    const proximity = activeDir && path.startsWith(`${activeDir}/`) ? 14 : 0;
    const popular = popularQueries.reduce((score, [word, entry]) => {
      const chosen = history?.choices?.[word]?.[path] ?? 0;
      return score + Math.min(18, chosen * 7) + (chosen || !name.toLocaleLowerCase().includes(word) ? 0 : Math.min(7, entry.count * 2));
    }, 0);
    const score = (term ? Math.max(nameScore * 3, pathScore) * 10 : 0)
      + frequency + recency + popular + proximity
      + (tabs.has(path) ? 25 : 0) + (pinned.has(path) ? 20 : 0)
      + (term ? Math.min(24, (history?.choices?.[term]?.[path] ?? 0) * 8) : 0);
    return { path, score };
  })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, context.limit ?? 50)
    .map((item) => item.path);
}
