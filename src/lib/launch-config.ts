import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { create } from "zustand";
import { launchAndAttach } from "@/lib/debug-launcher";
import {
  parseLaunchConfigs,
  substituteVars,
  type LaunchConfig,
} from "@/lib/launch-config-core";
import { sq } from "@/lib/shell-quote";
import { useWorkspaceStore } from "@/lib/workspace-store";

const FILES = [".vscode/launch.json", ".l8ide/launch.json"];

export const useLaunchPalette = create<{
  open: boolean;
  configs: LaunchConfig[];
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  configs: [],
  setOpen: (open) => set({ open }),
}));

export async function loadLaunchConfigs(root: string): Promise<void> {
  const base = root.replace(/\/+$/, "");
  for (const rel of FILES) {
    const path = `${base}/${rel}`;
    if (!(await exists(path).catch(() => false))) continue;
    const text = await readTextFile(path).catch(() => "");
    const configs = parseLaunchConfigs(text);
    if (configs.length) {
      useLaunchPalette.setState({ configs });
      return;
    }
  }
  useLaunchPalette.setState({ configs: [] });
}

export async function runLaunchConfig(config: LaunchConfig): Promise<void> {
  const ws = useWorkspaceStore.getState();
  const root = ws.rootPath?.replace(/\/+$/, "");
  if (!root) {
    toast.info("Kein Projekt geöffnet.");
    return;
  }
  const ctx = { workspaceFolder: root, file: ws.activeFile };
  const program = substituteVars(config.program, ctx);
  const args = (config.args ?? []).map((a) => sq(substituteVars(a, ctx)));
  const cwd = config.cwd ? substituteVars(config.cwd, ctx) : root;
  const envPrefix = Object.entries(config.env ?? {})
    .map(([k, v]) => `${k}=${sq(substituteVars(v, ctx))}`)
    .join(" ");
  const parts = [
    `cd ${sq(cwd)} &&`,
    envPrefix,
    "node --inspect-brk=9229",
    sq(program),
    ...args,
  ].filter(Boolean);
  await launchAndAttach(parts.join(" "));
}

export function openLaunchPalette(): void {
  const configs = useLaunchPalette.getState().configs;
  if (configs.length === 0) {
    void import("@/lib/debug-launcher").then((m) => m.debugActiveFile());
    return;
  }
  if (configs.length === 1) {
    void runLaunchConfig(configs[0]);
    return;
  }
  useLaunchPalette.getState().setOpen(true);
}
