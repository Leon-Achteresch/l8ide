import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { filesToRerun } from "@/lib/continuous-run-core";
import { runFileWithResults, useTestResults } from "@/lib/test-results";

export const useContinuousRun = create<{
  enabled: boolean;
  toggle: () => void;
}>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: "continuous-run" },
  ),
);

let timer: ReturnType<typeof setTimeout> | undefined;
const pending = new Set<string>();

export function onFileSaved(savedPath: string): void {
  if (!useContinuousRun.getState().enabled) return;
  const known = Object.keys(useTestResults.getState().byPath);
  for (const f of filesToRerun(savedPath, known)) pending.add(f);
  if (pending.size === 0) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const files = [...pending];
    pending.clear();
    for (const f of files) void runFileWithResults(f);
  }, 400);
}

export function toggleContinuousRun(): void {
  useContinuousRun.getState().toggle();
  const on = useContinuousRun.getState().enabled;
  toast.info(
    on
      ? "Continuous Run an — Tests laufen beim Speichern automatisch."
      : "Continuous Run aus.",
  );
}
