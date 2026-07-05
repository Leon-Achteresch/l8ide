// Portiert aus Cline (cline/cline, src/core/assistant-message/diff.ts, Apache-2.0,
// Copyright Cline Bot Inc.). Match-Kaskade exact -> line-trimmed -> block-anchor.
// Siehe docs/AI_OSS_REUSE.md.

const SEARCH_START = /^[-]{3,} SEARCH>?$/;
const SEARCH_START_LEGACY = /^[<]{3,} SEARCH>?$/;
const DIVIDER = /^[=]{3,}$/;
const REPLACE_END = /^[+]{3,} REPLACE>?$/;
const REPLACE_END_LEGACY = /^[>]{3,} REPLACE>?$/;

const isSearchStart = (l: string) =>
  SEARCH_START.test(l) || SEARCH_START_LEGACY.test(l);
const isDivider = (l: string) => DIVIDER.test(l);
const isReplaceEnd = (l: string) =>
  REPLACE_END.test(l) || REPLACE_END_LEGACY.test(l);

export class DiffError extends Error {
  searchContent: string;
  constructor(message: string, searchContent = "") {
    super(message);
    this.name = "DiffError";
    this.searchContent = searchContent;
  }
}

type Range = [number, number] | false;

function lineTrimmedMatch(
  original: string,
  search: string,
  startIndex: number,
): Range {
  const oLines = original.split("\n");
  const sLines = search.split("\n");
  if (sLines[sLines.length - 1] === "") sLines.pop();
  if (sLines.length === 0) return false;

  let startLine = 0;
  let idx = 0;
  while (idx < startIndex && startLine < oLines.length) {
    idx += oLines[startLine].length + 1;
    startLine++;
  }

  for (let i = startLine; i <= oLines.length - sLines.length; i++) {
    let ok = true;
    for (let j = 0; j < sLines.length; j++) {
      if (oLines[i + j].trim() !== sLines[j].trim()) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let start = 0;
    for (let k = 0; k < i; k++) start += oLines[k].length + 1;
    let end = start;
    for (let k = 0; k < sLines.length; k++) end += oLines[i + k].length + 1;
    return [start, end];
  }
  return false;
}

function blockAnchorMatch(
  original: string,
  search: string,
  startIndex: number,
): Range {
  const oLines = original.split("\n");
  const sLines = search.split("\n");
  if (sLines[sLines.length - 1] === "") sLines.pop();
  if (sLines.length < 3) return false;

  const first = sLines[0].trim();
  const last = sLines[sLines.length - 1].trim();
  const size = sLines.length;

  let startLine = 0;
  let idx = 0;
  while (idx < startIndex && startLine < oLines.length) {
    idx += oLines[startLine].length + 1;
    startLine++;
  }

  for (let i = startLine; i <= oLines.length - size; i++) {
    if (oLines[i].trim() !== first) continue;
    if (oLines[i + size - 1].trim() !== last) continue;
    let start = 0;
    for (let k = 0; k < i; k++) start += oLines[k].length + 1;
    let end = start;
    for (let k = 0; k < size; k++) end += oLines[i + k].length + 1;
    return [start, end];
  }
  return false;
}

function findSimilarLines(search: string, original: string, threshold = 0.6) {
  const sLines = search.trim().split("\n");
  const oLines = original.split("\n");
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i <= oLines.length - sLines.length; i++) {
    let score = 0;
    for (let j = 0; j < sLines.length; j++) {
      if (oLines[i + j].trim() === sLines[j].trim()) score++;
    }
    score /= sLines.length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best === -1 || bestScore < threshold) return "";
  return oLines.slice(Math.max(0, best - 1), best + sLines.length + 1).join("\n");
}

type Replacement = { start: number; end: number; content: string };

/**
 * Wendet einen oder mehrere SEARCH/REPLACE-Blöcke auf `original` an.
 * Matcht in der Reihenfolge exakt -> zeilen-getrimmt -> block-anchor.
 * Wirft `DiffError` (mit "did you mean?"-Hinweis), wenn ein Block nicht passt.
 */
export function applyDiff(original: string, diffContent: string): string {
  const replacements: Replacement[] = [];
  let search = "";
  let replace = "";
  let inSearch = false;
  let inReplace = false;
  let matchStart = -1;
  let matchEnd = -1;
  let lastProcessed = 0;

  for (const line of diffContent.split("\n")) {
    if (isSearchStart(line)) {
      inSearch = true;
      inReplace = false;
      search = "";
      replace = "";
      continue;
    }
    if (isDivider(line) && inSearch) {
      inSearch = false;
      inReplace = true;
      if (!search) {
        if (original.length === 0) {
          matchStart = 0;
          matchEnd = 0;
        } else {
          throw new DiffError(
            "Leerer SEARCH-Block bei nicht-leerer Datei. Der SEARCH-Block muss den zu ersetzenden Text exakt enthalten.",
            search,
          );
        }
      } else {
        const exact = original.indexOf(search, lastProcessed);
        if (exact !== -1) {
          matchStart = exact;
          matchEnd = exact + search.length;
        } else {
          const lt = lineTrimmedMatch(original, search, lastProcessed);
          if (lt) {
            [matchStart, matchEnd] = lt;
          } else {
            const ba = blockAnchorMatch(original, search, lastProcessed);
            if (ba) {
              [matchStart, matchEnd] = ba;
            } else {
              const anywhere = original.indexOf(search, 0);
              if (anywhere !== -1) {
                matchStart = anywhere;
                matchEnd = anywhere + search.length;
              } else {
                const hint = findSimilarLines(search, original);
                throw new DiffError(
                  `SEARCH-Block nicht in der Datei gefunden:\n${search.trimEnd()}` +
                    (hint
                      ? `\n\nÄhnlichste Stelle (evtl. gemeint?):\n${hint}`
                      : "") +
                    `\n\nGib den Block mit exakt passendem SEARCH-Text erneut aus.`,
                  search,
                );
              }
            }
          }
        }
      }
      continue;
    }
    if (isReplaceEnd(line) && inReplace) {
      if (matchStart === -1) {
        throw new DiffError("REPLACE-Marker ohne gültigen SEARCH-Match.", search);
      }
      replacements.push({ start: matchStart, end: matchEnd, content: replace });
      lastProcessed = matchEnd;
      inSearch = false;
      inReplace = false;
      search = "";
      replace = "";
      matchStart = -1;
      matchEnd = -1;
      continue;
    }
    if (inSearch) search += line + "\n";
    else if (inReplace) replace += line + "\n";
  }

  if (inReplace && matchStart !== -1) {
    replacements.push({ start: matchStart, end: matchEnd, content: replace });
  }
  if (replacements.length === 0) {
    throw new DiffError(
      'Kein gültiger SEARCH/REPLACE-Block gefunden. Format: "------- SEARCH" / "=======" / "+++++++ REPLACE".',
    );
  }

  replacements.sort((a, b) => a.start - b.start);
  let result = "";
  let pos = 0;
  for (const r of replacements) {
    result += original.slice(pos, r.start);
    result += r.content;
    pos = r.end;
  }
  result += original.slice(pos);
  return result;
}
