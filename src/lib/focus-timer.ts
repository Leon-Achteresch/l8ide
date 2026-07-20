import { toast } from "sonner";
import { create } from "zustand";
import { useNotifications } from "@/lib/notifications";

const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;

type Phase = "idle" | "focus" | "break";

type FocusTimer = {
  phase: Phase;
  endsAt: number;
  remaining: number;
  dndBefore: boolean;
  start: (phase: "focus" | "break") => void;
  stop: () => void;
  tick: () => void;
};

let interval: ReturnType<typeof setInterval> | null = null;

function ensureTicking() {
  if (interval) return;
  interval = setInterval(() => useFocusTimer.getState().tick(), 1000);
}

export const useFocusTimer = create<FocusTimer>((set, get) => ({
  phase: "idle",
  endsAt: 0,
  remaining: 0,
  dndBefore: false,

  start: (phase) => {
    const duration = phase === "focus" ? FOCUS_MS : BREAK_MS;
    const dndBefore = useNotifications.getState().dnd;
    if (phase === "focus") useNotifications.getState().setDnd(true);
    ensureTicking();
    set({
      phase,
      endsAt: Date.now() + duration,
      remaining: duration,
      dndBefore,
    });
  },

  stop: () => {
    const { dndBefore } = get();
    useNotifications.getState().setDnd(dndBefore);
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    set({ phase: "idle", endsAt: 0, remaining: 0 });
  },

  tick: () => {
    const { phase, endsAt, dndBefore } = get();
    if (phase === "idle") return;
    const remaining = endsAt - Date.now();
    if (remaining > 0) {
      set({ remaining });
      return;
    }
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    useNotifications.getState().setDnd(dndBefore);
    set({ phase: "idle", endsAt: 0, remaining: 0 });
    if (phase === "focus") {
      toast.success("Fokus-Session beendet — Zeit für eine Pause.", {
        action: { label: "5 Min Pause", onClick: () => get().start("break") },
      });
    } else {
      toast.info("Pause vorbei — weiter geht's.", {
        action: { label: "25 Min Fokus", onClick: () => get().start("focus") },
      });
    }
  },
}));

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
