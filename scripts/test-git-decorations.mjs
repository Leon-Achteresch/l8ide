import assert from "node:assert/strict";
import { decoFor } from "../src/lib/git-status-letter.ts";

function entry(over) {
  return {
    untracked: false,
    staged: false,
    unstaged: false,
    index_status: "",
    worktree_status: "",
    ...over,
  };
}

assert.equal(decoFor(entry({ untracked: true }))?.letter, "U");
assert.equal(
  decoFor(entry({ unstaged: true, worktree_status: "M" }))?.letter,
  "M",
);
assert.equal(
  decoFor(entry({ staged: true, index_status: "A" }))?.letter,
  "A",
);
assert.equal(
  decoFor(entry({ unstaged: true, worktree_status: "D" }))?.letter,
  "D",
);
assert.equal(
  decoFor(entry({ unstaged: true, worktree_status: "R" }))?.letter,
  "R",
);
assert.equal(
  decoFor(entry({ unstaged: true, worktree_status: "U" }))?.letter,
  "!",
);
assert.equal(
  decoFor(entry({ unstaged: true, worktree_status: "modified" }))?.letter,
  "M",
);
assert.equal(
  decoFor(entry({ staged: true, index_status: "deleted" }))?.letter,
  "D",
);
assert.equal(decoFor(entry({})), null);
assert.equal(
  decoFor(entry({ staged: true, index_status: " " }))?.letter,
  "M",
);

console.log("git-decorations: all assertions passed");
