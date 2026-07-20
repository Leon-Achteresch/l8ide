import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConsoleLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "input";
export type ConsoleEntry = {
  id: number;
  level: ConsoleLevel;
  text: string;
  time: number;
};

const MAX_ENTRIES = 1000;
let nextId = 1;

type BrowserConsoleStore = {
  entries: ConsoleEntry[];
  open: boolean;
  height: number;
  errorCount: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setHeight: (height: number) => void;
  clear: () => void;
};

export const useBrowserConsole = create<BrowserConsoleStore>()(
  persist(
    (set) => ({
      entries: [],
      open: false,
      height: 200,
      errorCount: 0,
      setOpen: (open) => set({ open }),
      toggle: () => set((s) => ({ open: !s.open })),
      setHeight: (height) =>
        set({ height: Math.max(100, Math.min(500, height)) }),
      clear: () => set({ entries: [], errorCount: 0 }),
    }),
    {
      name: "browser-console",
      partialize: (s) => ({ open: s.open, height: s.height }),
    },
  ),
);

export function pushConsoleInput(code: string) {
  useBrowserConsole.setState((s) => ({
    entries: [
      ...s.entries,
      { id: nextId++, level: "input" as const, text: code, time: Date.now() },
    ].slice(-MAX_ENTRIES),
  }));
}

export function evalInBrowser(code: string) {
  pushConsoleInput(code);
  const wrapped = `try { var __l8r = (0, eval)(${JSON.stringify(code)}); console.log(__l8r === undefined ? "undefined" : __l8r); } catch (e) { console.error(String(e)); }`;
  void import("@/lib/browser").then((m) => m.browserEval(wrapped));
}

let wired = false;

export function wireBrowserConsole() {
  if (wired) return;
  wired = true;
  void listen<string>("browser-console", (e) => {
    let batch: { level: ConsoleLevel; text: string; time: number }[];
    try {
      batch = JSON.parse(e.payload);
    } catch {
      return;
    }
    if (!Array.isArray(batch) || batch.length === 0) return;
    useBrowserConsole.setState((s) => {
      const entries = [
        ...s.entries,
        ...batch.map((b) => ({
          id: nextId++,
          level: b.level ?? "log",
          text: String(b.text ?? ""),
          time: b.time ?? Date.now(),
        })),
      ].slice(-MAX_ENTRIES);
      const errorCount =
        s.errorCount + batch.filter((b) => b.level === "error").length;
      return { entries, errorCount };
    });
  });
}
