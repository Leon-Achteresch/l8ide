import { create } from "zustand";
import { openFileAt } from "@/lib/monaco-navigation";
import {
  canBack,
  canForward,
  type NavEntry,
  type NavState,
  pushEntry,
} from "@/lib/nav-history-core";

let pendingNav: NavEntry | null = null;

type NavHistory = NavState & {
  record: (path: string, line: number, column: number) => void;
  back: () => void;
  forward: () => void;
};

function go(entry: NavEntry) {
  pendingNav = entry;
  openFileAt(entry.path, { line: entry.line, column: entry.column });
}

export const useNavHistory = create<NavHistory>((set, get) => ({
  entries: [],
  index: -1,
  record: (path, line, column) => {
    if (
      pendingNav &&
      pendingNav.path === path &&
      Math.abs(pendingNav.line - line) < 3
    ) {
      pendingNav = null;
      return;
    }
    const next = pushEntry(get(), { path, line, column });
    if (next) set(next);
  },
  back: () => {
    const s = get();
    if (!canBack(s)) return;
    const index = s.index - 1;
    set({ index });
    go(s.entries[index]!);
  },
  forward: () => {
    const s = get();
    if (!canForward(s)) return;
    const index = s.index + 1;
    set({ index });
    go(s.entries[index]!);
  },
}));
