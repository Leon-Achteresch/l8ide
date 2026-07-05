import { useMemo } from "react";
import { useGitStore, type StatusEntry } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { decoFor, type GitDeco } from "@/lib/git-status-letter";

export type { GitDeco };

let cache: { entries: StatusEntry[]; map: Map<string, GitDeco> } | null = null;

function decoMap(entries: StatusEntry[]): Map<string, GitDeco> {
  if (cache && cache.entries === entries) return cache.map;
  const map = new Map<string, GitDeco>();
  for (const e of entries) {
    const d = decoFor(e);
    if (d) map.set(e.path, d);
  }
  cache = { entries, map };
  return map;
}

function relativeTo(root: string, abs: string): string | null {
  if (abs === root) return "";
  const prefix = root.endsWith("/") ? root : `${root}/`;
  return abs.startsWith(prefix) ? abs.slice(prefix.length) : null;
}

const FOLDER_DECO: GitDeco = { letter: "", className: "text-amber-500" };

export function useGitDeco(absPath: string, isDir: boolean): GitDeco | null {
  const entries = useGitStore((s) => s.entries);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  return useMemo(() => {
    if (!rootPath || entries.length === 0) return null;
    const rel = relativeTo(rootPath, absPath);
    if (rel == null) return null;
    const map = decoMap(entries);
    if (!isDir) return map.get(rel) ?? null;
    const prefix = `${rel}/`;
    for (const key of map.keys()) {
      if (key.startsWith(prefix)) return FOLDER_DECO;
    }
    return null;
  }, [entries, rootPath, absPath, isDir]);
}
