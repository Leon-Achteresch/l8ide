import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

type FileHeatmapStore = {
  enabled: boolean;
  counts: Record<string, number>;
  max: number;
  loadedRoot: string | null;
  toggle: () => void;
  ensureLoaded: () => Promise<void>;
};

export const useFileHeatmap = create<FileHeatmapStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      counts: {},
      max: 0,
      loadedRoot: null,
      toggle: () => {
        const enabled = !get().enabled;
        set({ enabled });
        if (enabled) void get().ensureLoaded();
      },
      ensureLoaded: async () => {
        const root = useWorkspaceStore.getState().rootPath;
        if (!root || get().loadedRoot === root) return;
        set({ loadedRoot: root });
        try {
          const res = await invoke<ShellResult>("run_shell", {
            cwd: root,
            command: "git log --name-only --pretty=format: -500",
            timeoutMs: 15000,
          });
          const counts: Record<string, number> = {};
          let max = 0;
          for (const raw of res.stdout.split("\n")) {
            const line = raw.trim();
            if (!line) continue;
            const next = (counts[line] ?? 0) + 1;
            counts[line] = next;
            if (next > max) max = next;
          }
          set({ counts, max });
        } catch {
          set({ counts: {}, max: 0 });
        }
      },
    }),
    { name: "file-heatmap", partialize: (s) => ({ enabled: s.enabled }) },
  ),
);

export function heatOf(
  counts: Record<string, number>,
  max: number,
  absPath: string,
): number {
  const root = useWorkspaceStore.getState().rootPath;
  if (!root || !absPath.startsWith(`${root}/`)) return 0;
  const count = counts[absPath.slice(root.length + 1)] ?? 0;
  return count === 0 ? 0 : Math.min(1, count / max);
}
