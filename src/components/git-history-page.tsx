import { invoke } from "@tauri-apps/api/core";
import { GitCommit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useGitStore } from "@/lib/git-store";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Commit = {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  subject: string;
  tags: string[];
};

const PAGE = 100;

async function refresh() {
  await useGitStore.getState().refresh();
}

export function GitHistoryPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [commits, setCommits] = useState<Commit[] | null>(null);

  const load = () => {
    const root = rootPath?.replace(/\/+$/, "");
    if (!root) return;
    void invoke<Commit[]>("repo_log_page", { path: root, skip: 0, limit: PAGE })
      .then(setCommits)
      .catch(() => setCommits([]));
  };

  useEffect(load, [rootPath]);

  const run = async (
    label: string,
    fn: () => Promise<unknown>,
    reload = true,
  ) => {
    try {
      await fn();
      toast.success(label);
      await refresh();
      if (reload) load();
    } catch (e) {
      toast.error(String(e));
    }
  };

  const root = rootPath?.replace(/\/+$/, "") ?? "";

  if (!commits) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Lade Verlauf…
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <GitCommit className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Verlauf</h1>
          <span className="text-xs text-muted-foreground">
            {commits.length} Commits · Rechtsklick für Aktionen
          </span>
        </div>
        <div className="space-y-0.5">
          {commits.map((c) => (
            <ContextMenu key={c.hash}>
              <ContextMenuTrigger>
                <div className="flex items-baseline gap-3 rounded-md px-2 py-1 hover:bg-foreground/[0.04]">
                  <span className="shrink-0 font-mono text-[11px] text-violet-500">
                    {c.short_hash}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {c.subject}
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {c.author} · {c.date}
                  </span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem
                  onClick={() =>
                    void navigator.clipboard.writeText(c.hash).then(() =>
                      toast.success("Hash kopiert"),
                    )
                  }
                >
                  Hash kopieren
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() =>
                    void run("Cherry-Pick angewendet", () =>
                      invoke("git_cherry_pick", {
                        path: root,
                        commits: [c.hash],
                        mainline: null,
                      }),
                    )
                  }
                >
                  Cherry-Pick auf aktuellen Branch
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() =>
                    void run("Commit revertiert", () =>
                      invoke("git_revert_commit", {
                        path: root,
                        commit: c.hash,
                        mergeMainline: null,
                      }),
                    )
                  }
                >
                  Revert (rückgängig als neuer Commit)
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => {
                    const name = prompt(`Tag-Name für ${c.short_hash}:`);
                    if (name?.trim())
                      void run("Tag erstellt", () =>
                        invoke("git_tag_commit", {
                          path: root,
                          name: name.trim(),
                          commit: c.hash,
                        }),
                      );
                  }}
                >
                  Tag auf diesen Commit
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      </div>
    </div>
  );
}
