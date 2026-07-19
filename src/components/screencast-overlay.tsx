import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SWAP } from "@/lib/ease";
import { useViewStore } from "@/lib/view-store";

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  Enter: "⏎",
  Escape: "Esc",
  Backspace: "⌫",
  Delete: "⌦",
  Tab: "⇥",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
};

const MODIFIER_KEYS = new Set(["Meta", "Control", "Alt", "Shift"]);

function formatKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("⌃");
  if (e.altKey) parts.push("⌥");
  if (e.shiftKey) parts.push("⇧");
  if (e.metaKey) parts.push("⌘");
  const label =
    KEY_LABELS[e.key] ??
    (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  parts.push(label);
  return parts.join("");
}

type Chip = { id: number; label: string; count: number };

let chipId = 0;

export function ScreencastOverlay() {
  const on = useViewStore((s) => s.screencastMode);
  const [chips, setChips] = useState<Chip[]>([]);

  useEffect(() => {
    if (!on) {
      setChips([]);
      return;
    }
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onKey = (e: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(e.key)) return;
      const label = formatKey(e);
      setChips((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.label === label) {
          return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
        }
        const id = ++chipId;
        const timer = setTimeout(() => {
          timers.delete(timer);
          setChips((p) => p.filter((c) => c.id !== id));
        }, 1600);
        timers.add(timer);
        return [...prev.slice(-4), { id, label, count: 1 }];
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      for (const t of timers) clearTimeout(t);
      setChips([]);
    };
  }, [on]);

  if (!on) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-14 z-50 flex justify-center gap-1.5">
      <AnimatePresence mode="popLayout">
        {chips.map((chip) => (
          <motion.span
            key={chip.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={SPRING_SWAP}
            className="rounded-xl bg-foreground/85 px-3 py-1.5 font-mono text-sm font-medium text-background shadow-lg backdrop-blur"
          >
            {chip.label}
            {chip.count > 1 && (
              <span className="ml-1.5 text-xs opacity-70">×{chip.count}</span>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
