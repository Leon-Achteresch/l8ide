import { useEffect, useRef, useState } from "react";
import { Ban, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_PANEL } from "@/lib/ease";
import {
  evalInBrowser,
  useBrowserConsole,
  type ConsoleLevel,
} from "@/lib/browser-console-store";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<ConsoleLevel, string> = {
  log: "text-foreground/80",
  debug: "text-muted-foreground",
  info: "text-sky-500",
  warn: "text-amber-500",
  error: "text-red-500",
  input: "text-violet-500",
};

function timeLabel(t: number) {
  return new Date(t).toLocaleTimeString("de-DE", { hour12: false });
}

function ReplInput() {
  const [value, setValue] = useState("");
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);

  const submit = () => {
    const code = value.trim();
    if (!code) return;
    evalInBrowser(code);
    historyRef.current.push(code);
    indexRef.current = -1;
    setValue("");
  };

  const navigate = (delta: number) => {
    const history = historyRef.current;
    if (history.length === 0) return;
    const next =
      indexRef.current === -1
        ? delta < 0
          ? history.length - 1
          : -1
        : Math.min(history.length - 1, Math.max(-1, indexRef.current + delta));
    indexRef.current = next;
    setValue(next === -1 ? "" : history[next]);
  };

  return (
    <div className="flex shrink-0 items-center gap-2 px-2.5 pb-1.5">
      <span className="shrink-0 font-mono text-[11px] text-violet-500">❯</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          else if (e.key === "ArrowUp") {
            e.preventDefault();
            navigate(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            navigate(1);
          }
        }}
        placeholder="JS im Seitenkontext ausführen…"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

export function BrowserConsole() {
  const open = useBrowserConsole((s) => s.open);
  const entries = useBrowserConsole((s) => s.entries);
  const height = useBrowserConsole((s) => s.height);
  const clear = useBrowserConsole((s) => s.clear);
  const setOpen = useBrowserConsole((s) => s.setOpen);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, open]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={SPRING_PANEL}
          className="shrink-0 overflow-hidden"
        >
          <div style={{ height }} className="flex flex-col bg-foreground/[0.02]">
            <div className="flex h-7 shrink-0 items-center gap-1.5 px-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Konsole
              </span>
              <span className="text-[10px] text-muted-foreground">
                {entries.length}
              </span>
              <div className="ml-auto flex gap-0.5">
                <button
                  type="button"
                  title="Konsole leeren"
                  onClick={clear}
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  <Ban className="size-3" />
                </button>
                <button
                  type="button"
                  title="Konsole schließen"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-1.5 font-mono text-[11px] leading-relaxed"
            >
              {entries.length === 0 ? (
                <p className="py-2 text-muted-foreground">
                  Noch keine Ausgaben.
                </p>
              ) : (
                entries.map((e) => (
                  <div key={e.id} className="flex gap-2">
                    <span className="shrink-0 tabular-nums text-muted-foreground/60">
                      {e.level === "input" ? "❯" : timeLabel(e.time)}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 whitespace-pre-wrap break-words",
                        LEVEL_CLASS[e.level] ?? LEVEL_CLASS.log,
                      )}
                    >
                      {e.text}
                    </span>
                  </div>
                ))
              )}
            </div>
            <ReplInput />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
