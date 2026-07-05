export type NavEntry = { path: string; line: number; column: number };
export type NavState = { entries: NavEntry[]; index: number };

const SAME_PLACE_LINES = 10;
const MAX = 50;

export function pushEntry(state: NavState, loc: NavEntry): NavState | null {
  const cur = state.entries[state.index];
  if (
    cur &&
    cur.path === loc.path &&
    Math.abs(cur.line - loc.line) < SAME_PLACE_LINES
  ) {
    return null;
  }
  let entries = state.entries.slice(0, state.index + 1);
  entries.push(loc);
  if (entries.length > MAX) entries = entries.slice(entries.length - MAX);
  return { entries, index: entries.length - 1 };
}

export function canBack(s: NavState): boolean {
  return s.index > 0;
}

export function canForward(s: NavState): boolean {
  return s.index < s.entries.length - 1;
}
