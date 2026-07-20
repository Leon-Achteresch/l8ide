import { invoke } from "@tauri-apps/api/core";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  GitBranch,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileIcon } from "@/lib/file-icons";
import { useGitDiffStore } from "@/lib/git-diff-store";
import { useGitStore, type StatusEntry } from "@/lib/git-store";
import { isConflictEntry, useMergeConflictStore } from "@/lib/merge-conflict-store";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

function baseName(p: string) {
  return p.split("/").pop() ?? p;
}

function dirName(p: string) {
  const i = p.lastIndexOf("/");
  return i > 0 ? p.slice(0, i) : "";
}

function ReviewResult() {
  const review = useGitStore((s) => s.review);
  const clearReview = useGitStore((s) => s.clearReview);
  if (!review) return null;
  const clean = review === "Keine Auffälligkeiten.";
  return (
    <div
      className={cn(
        "rounded-lg px-2.5 py-2 text-[11px] leading-relaxed",
        clean ? "bg-emerald-500/10" : "bg-amber-500/10",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <ShieldCheck
          className={cn(
            "size-3",
            clean ? "text-emerald-500" : "text-amber-500",
          )}
        />
        <span className="font-semibold text-foreground">KI-Review</span>
        <button
          type="button"
          title="Schließen"
          onClick={clearReview}
          className="ml-auto inline-flex size-4.5 items-center justify-center rounded text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
        >
          <Minus className="size-3" />
        </button>
      </div>
      <div className="whitespace-pre-wrap break-words text-foreground/85">
        {review}
      </div>
    </div>
  );
}

function confirmDiscard(entry: StatusEntry) {
  toast.warning(`„${baseName(entry.path)}" verwerfen?`, {
    description: entry.untracked
      ? "Die Datei wird gelöscht."
      : "Alle Änderungen gehen verloren.",
    action: {
      label: "Verwerfen",
      onClick: () =>
        void useGitStore
          .getState()
          .discard([{ path: entry.path, untracked: entry.untracked }]),
    },
  });
}

function statusLetter(e: StatusEntry, staged: boolean): string {
  if (e.untracked) return "U";
  const s = staged ? e.index_status : e.worktree_status;
  return (s || "M").slice(0, 1).toUpperCase();
}

function statusColor(e: StatusEntry): string {
  if (e.untracked) return "text-emerald-500";
  const s = (e.worktree_status || e.index_status || "").toUpperCase();
  if (s.startsWith("D")) return "text-red-500";
  if (s.startsWith("A")) return "text-emerald-500";
  return "text-amber-500";
}

function ChangeRow({
  entry,
  staged,
  rootPath,
}: {
  entry: StatusEntry;
  staged: boolean;
  rootPath: string;
}) {
  const stage = useGitStore((s) => s.stage);
  const unstage = useGitStore((s) => s.unstage);
  const openDiff = useGitDiffStore((s) => s.openDiff);
  const tabIcons = useWorkspaceStore((s) => s.tabIcons);
  const name = baseName(entry.path);
  const FileIcon = tabIcons ? fileIcon(name) : null;
  return (
    <div className="group flex h-7 items-center gap-1 rounded-md pl-2 pr-1 text-xs hover:bg-foreground/[0.04]">
      <button
        type="button"
        onClick={() => openDiff(rootPath, entry.path, staged ? "staged" : "working")}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        {FileIcon && <FileIcon className="size-3.5 shrink-0" />}
        <span className="truncate text-foreground">{name}</span>
        {dirName(entry.path) && (
          <span className="truncate text-[10px] text-muted-foreground">
            {dirName(entry.path)}
          </span>
        )}
      </button>
      {!staged && (
        <button
          type="button"
          title="Änderungen verwerfen"
          onClick={() => confirmDiscard(entry)}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/8 hover:text-red-500 group-hover:opacity-100"
        >
          <Undo2 className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        title={staged ? "Unstage" : "Stage"}
        onClick={() => (staged ? unstage([entry.path]) : stage([entry.path]))}
        className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
      >
        {staged ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
      <span
        className={cn(
          "w-3 shrink-0 text-center font-mono text-[10px]",
          statusColor(entry),
        )}
      >
        {statusLetter(entry, staged)}
      </span>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground disabled:opacity-40"
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </button>
  );
}

export function ScmPanel({ rootPath }: { rootPath: string }) {
  const entries = useGitStore((s) => s.entries);
  const branch = useGitStore((s) => s.branch);
  const error = useGitStore((s) => s.error);
  const loaded = useGitStore((s) => s.loaded);
  const busy = useGitStore((s) => s.busy);
  const reviewing = useGitStore((s) => s.reviewing);
  const commitMessage = useGitStore((s) => s.commitMessage);
  const setCommitMessage = useGitStore((s) => s.setCommitMessage);
  const refresh = useGitStore((s) => s.refresh);
  const commit = useGitStore((s) => s.commit);
  const stageAll = useGitStore((s) => s.stageAll);
  const push = useGitStore((s) => s.push);
  const pull = useGitStore((s) => s.pull);
  const fetch = useGitStore((s) => s.fetch);

  useEffect(() => {
    void refresh();
  }, [rootPath, refresh]);

  const [amend, setAmend] = useState(false);
  const conflicts = entries.filter(isConflictEntry);
  const staged = entries.filter((e) => e.staged && !isConflictEntry(e));
  const changes = entries.filter(
    (e) => (e.unstaged || e.untracked) && !isConflictEntry(e),
  );
  const canCommit =
    (staged.length > 0 || amend) && commitMessage.trim().length > 0 && !busy;

  const doCommit = async () => {
    await commit(amend);
    setAmend(false);
  };

  const openInL8git = () => {
    void invoke("open_in_l8git", { repo: rootPath }).catch((e) =>
      toast.error(String(e)),
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border px-2 py-1.5">
        <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {branch ?? "—"}
        </span>
        <ToolbarButton icon={RefreshCw} label="Aktualisieren" onClick={() => void refresh()} />
        <ToolbarButton icon={ArrowDownToLine} label="Pull" onClick={() => void pull()} disabled={busy} />
        <ToolbarButton icon={ArrowUpFromLine} label="Push" onClick={() => void push()} disabled={busy} />
        <ToolbarButton icon={SquareArrowOutUpRight} label="In l8git öffnen" onClick={openInL8git} />
      </div>

      <div className="shrink-0 space-y-1.5 border-b border-sidebar-border p-2">
        <ReviewResult />
        <div className="relative">
          <button
            type="button"
            title="Commit-Message generieren (KI, aus gestagten Änderungen)"
            disabled={busy || staged.length === 0}
            onClick={() => void useGitStore.getState().generateCommitMessage()}
            className="absolute bottom-1.5 right-1.5 z-10 inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Sparkles className="size-3" />
            )}
          </button>
          <textarea
            value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              if (canCommit) void doCommit();
            }
          }}
            placeholder="Commit-Nachricht (⌘⏎ zum Committen)"
            spellCheck={false}
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-transparent py-1.5 pl-2 pr-7 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 flex-1 text-xs"
            disabled={!canCommit}
            onClick={() => void doCommit()}
          >
            <Check className="size-3.5" />
            {amend ? "Amend" : "Commit"}
          </Button>
          <button
            type="button"
            title="Letzten Commit ändern (--amend)"
            aria-pressed={amend}
            onClick={() => setAmend((v) => !v)}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-2 text-[10px] font-medium transition-colors",
              amend
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
            )}
          >
            Amend
          </button>
          <button
            type="button"
            title="KI-Review der gestagten Änderungen"
            disabled={busy || reviewing || staged.length === 0}
            onClick={() => void useGitStore.getState().reviewStaged()}
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            {reviewing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <ShieldCheck className="size-3" />
            )}
            Review
          </button>
          <ToolbarButton icon={RefreshCw} label="Fetch" onClick={() => void fetch()} disabled={busy} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1">
        {error ? (
          <p className="px-2 py-3 text-[11px] text-destructive">{error}</p>
        ) : !loaded ? (
          <p className="px-2 py-3 text-[11px] text-muted-foreground">Lädt…</p>
        ) : entries.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-muted-foreground">
            Keine Änderungen.
          </p>
        ) : (
          <>
            {conflicts.length > 0 && (
              <Section
                title="Merge-Konflikte"
                count={conflicts.length}
                action={
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      title="Merge abschließen"
                      onClick={() =>
                        void invoke("git_merge_commit", { path: rootPath })
                          .then(() => {
                            toast.success("Merge abgeschlossen");
                            void useGitStore.getState().refresh();
                          })
                          .catch((e) => toast.error(String(e)))
                      }
                      className="inline-flex h-6 items-center rounded-md px-1.5 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      Abschließen
                    </button>
                    <button
                      type="button"
                      title="Merge abbrechen"
                      onClick={() =>
                        toast.warning("Merge abbrechen?", {
                          description: "Der Merge wird zurückgesetzt.",
                          action: {
                            label: "Abbrechen",
                            onClick: () =>
                              void invoke("git_merge_abort", { path: rootPath })
                                .then(() => void useGitStore.getState().refresh())
                                .catch((e) => toast.error(String(e))),
                          },
                        })
                      }
                      className="inline-flex h-6 items-center rounded-md px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-red-500"
                    >
                      Verwerfen
                    </button>
                  </div>
                }
              >
                {conflicts.map((e) => (
                  <button
                    key={`x:${e.path}`}
                    type="button"
                    onClick={() =>
                      useMergeConflictStore
                        .getState()
                        .openConflict(rootPath, e.path)
                    }
                    className="group flex h-7 w-full items-center gap-1.5 rounded-md pl-2 pr-1 text-left text-xs hover:bg-amber-500/10"
                  >
                    <span className="truncate text-foreground">
                      {baseName(e.path)}
                    </span>
                    {dirName(e.path) && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {dirName(e.path)}
                      </span>
                    )}
                    <span className="ml-auto w-3 shrink-0 text-center font-mono text-[10px] text-amber-500">
                      !
                    </span>
                  </button>
                ))}
              </Section>
            )}
            {staged.length > 0 && (
              <Section
                title="Staged Changes"
                count={staged.length}
                action={
                  <ToolbarButton
                    icon={Minus}
                    label="Alle unstagen"
                    onClick={() => void useGitStore.getState().unstageAll()}
                  />
                }
              >
                {staged.map((e) => (
                  <ChangeRow key={`s:${e.path}`} entry={e} staged rootPath={rootPath} />
                ))}
              </Section>
            )}
            {changes.length > 0 && (
              <Section
                title="Changes"
                count={changes.length}
                action={
                  <ToolbarButton icon={Plus} label="Alle stagen" onClick={() => void stageAll()} />
                }
              >
                {changes.map((e) => (
                  <ChangeRow key={`c:${e.path}`} entry={e} staged={false} rootPath={rootPath} />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex h-6 items-center gap-1.5 px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="text-[10px] text-muted-foreground">{count}</span>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </div>
  );
}
