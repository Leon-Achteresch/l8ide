import {
  ArrowDownToDot,
  ArrowUpFromDot,
  Bug,
  ChevronRight,
  Pause,
  Play,
  Redo2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { jumpToFrame, useDebugger } from "@/lib/debugger";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

const BTN =
  "inline-flex size-6 items-center justify-center rounded-md text-background/70 transition-colors hover:bg-background/15 hover:text-background disabled:opacity-30 disabled:pointer-events-none";

function relLabel(url: string): string {
  const path = url.startsWith("file://") ? decodeURI(url.slice(7)) : url;
  const root = useWorkspaceStore.getState().rootPath;
  if (root && path.startsWith(`${root}/`)) return path.slice(root.length + 1);
  return path.split("/").slice(-2).join("/");
}

export function DebugIsland() {
  const state = useDebugger((s) => s.state);
  const frames = useDebugger((s) => s.frames);
  const dbg = useDebugger.getState();
  const [stackOpen, setStackOpen] = useState(false);

  if (state === "disconnected") return null;
  const paused = state === "paused";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-40 flex justify-center">
      <motion.div
        layout
        transition={SPRING_LAYOUT}
        className={cn(
          "pointer-events-auto overflow-hidden rounded-2xl shadow-lg backdrop-blur",
          paused ? "bg-amber-600/95" : "bg-foreground/90",
        )}
      >
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Bug className="ml-1 size-3.5 shrink-0 text-background/80" />
          <span className="mr-1 text-xs font-medium text-background">
            {state === "connecting"
              ? "Verbinde…"
              : paused
                ? "Pausiert"
                : "Läuft"}
          </span>
          {paused ? (
            <button type="button" title="Fortsetzen (Continue)" onClick={dbg.resume} className={BTN}>
              <Play className="size-3.5" />
            </button>
          ) : (
            <button type="button" title="Pausieren" onClick={dbg.pause} className={BTN}>
              <Pause className="size-3.5" />
            </button>
          )}
          <button type="button" title="Step Over" onClick={dbg.stepOver} disabled={!paused} className={BTN}>
            <Redo2 className="size-3.5" />
          </button>
          <button type="button" title="Step Into" onClick={dbg.stepInto} disabled={!paused} className={BTN}>
            <ArrowDownToDot className="size-3.5" />
          </button>
          <button type="button" title="Step Out" onClick={dbg.stepOut} disabled={!paused} className={BTN}>
            <ArrowUpFromDot className="size-3.5" />
          </button>
          {paused && frames.length > 0 && (
            <button
              type="button"
              title="Call Stack"
              onClick={() => setStackOpen((v) => !v)}
              className={cn(BTN, "w-auto gap-0.5 px-1.5 text-[10px] font-medium")}
            >
              <motion.span
                animate={{ rotate: stackOpen ? 90 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              >
                <ChevronRight className="size-3" />
              </motion.span>
              Stack {frames.length}
            </button>
          )}
          <button type="button" title="Trennen" onClick={dbg.disconnect} className={BTN}>
            <X className="size-3.5" />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {paused && stackOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_LAYOUT}
              className="overflow-hidden"
            >
              <div className="max-h-48 overflow-y-auto px-2 pb-2">
                {frames.map((f, i) => (
                  <button
                    key={`${f.url}:${f.line}:${i}`}
                    type="button"
                    onClick={() => jumpToFrame(f)}
                    className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-0.5 text-left font-mono text-[11px] text-background/85 hover:bg-background/15"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {f.functionName}
                    </span>
                    <span className="shrink-0 text-[10px] text-background/55">
                      {relLabel(f.url)}:{f.line}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
