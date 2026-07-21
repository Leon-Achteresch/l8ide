import { invoke } from "@tauri-apps/api/core";
import { sq } from "@/lib/shell-quote";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

const repoOk = new Map<string, boolean>();

export function resetIgnoreCache() {
  repoOk.clear();
}

export async function ignoredNames(
  dir: string,
  names: string[],
): Promise<Set<string>> {
  const empty = new Set<string>();
  const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
  if (!root || !dir.startsWith(root) || names.length === 0) return empty;
  if (repoOk.get(root) === false) return empty;
  try {
    const res = await invoke<ShellResult>("run_shell", {
      cwd: dir,
      command: `git check-ignore -- ${names.map(sq).join(" ")}`,
      timeoutMs: 5000,
    });
    if (res.code === 128) {
      repoOk.set(root, false);
      return empty;
    }
    repoOk.set(root, true);
    return new Set(
      res.stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    return empty;
  }
}
