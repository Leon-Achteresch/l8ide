export type GitDeco = { letter: string; className: string };

export type GitStatusLike = {
  untracked: boolean;
  staged: boolean;
  unstaged: boolean;
  index_status: string;
  worktree_status: string;
};

export function decoFor(e: GitStatusLike): GitDeco | null {
  if (e.untracked) return { letter: "U", className: "text-emerald-500" };
  const raw = e.unstaged ? e.worktree_status : e.index_status;
  const c = (raw || e.index_status || e.worktree_status || "")
    .trim()
    .toUpperCase()
    .charAt(0);
  switch (c) {
    case "D":
      return { letter: "D", className: "text-red-500" };
    case "A":
      return { letter: "A", className: "text-emerald-500" };
    case "R":
      return { letter: "R", className: "text-sky-500" };
    case "C":
      return { letter: "C", className: "text-sky-500" };
    case "U":
      return { letter: "!", className: "text-red-500" };
    case "M":
      return { letter: "M", className: "text-amber-500" };
    default:
      return e.staged || e.unstaged
        ? { letter: "M", className: "text-amber-500" }
        : null;
  }
}
