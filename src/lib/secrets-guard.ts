import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { addPathsToGitignore } from "@/lib/gitignore";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

const ENV_RE = /(^|\/)\.env(\.[\w.-]+)?$/;
const warned = new Set<string>();

export function isSecretFile(path: string): boolean {
  return ENV_RE.test(path);
}

export async function checkSecretExposure(path: string): Promise<void> {
  if (!isSecretFile(path) || warned.has(path)) return;
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
  if (!root || !path.startsWith(`${root}/`)) return;
  const rel = path.slice(root.length + 1);
  warned.add(path);
  try {
    const res = await invoke<ShellResult>("run_shell", {
      cwd: root,
      command: `git check-ignore -q ${JSON.stringify(rel)}; echo $?`,
      timeoutMs: 5000,
    });
    const ignored = res.stdout.trim() === "0";
    if (ignored) return;
  } catch {
    return;
  }
  toast.warning(`${rel} ist nicht in .gitignore`, {
    description:
      "Diese Datei enthält vermutlich Secrets und könnte versehentlich committet werden.",
    duration: 12000,
    action: {
      label: "Zu .gitignore",
      onClick: () => void addPathsToGitignore(root, [path]),
    },
  });
}
