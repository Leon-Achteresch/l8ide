import assert from "node:assert/strict";
import { openPreviewTabs } from "../src/lib/editor-groups.ts";

assert.deepEqual(
  openPreviewTabs([], [], null, "/a"),
  ["/a"],
  "first preview appends",
);

assert.deepEqual(
  openPreviewTabs(["/a"], [], "/a", "/b"),
  ["/b"],
  "single click reuses the preview slot",
);

assert.deepEqual(
  openPreviewTabs(["/a", "/b"], [], "/b", "/c"),
  ["/a", "/c"],
  "only the preview tab is replaced, permanent tabs stay",
);

assert.deepEqual(
  openPreviewTabs(["/a", "/b"], ["/b"], "/b", "/c"),
  ["/a", "/b", "/c"],
  "a pinned tab is never dropped even if it was preview",
);

assert.deepEqual(
  openPreviewTabs(["/a", "/b"], [], null, "/b"),
  ["/a", "/b"],
  "opening an already-open tab does not duplicate it",
);

assert.deepEqual(
  openPreviewTabs(["/a"], [], "/a", "/a"),
  ["/a"],
  "re-previewing the current preview keeps it once",
);

console.log("preview-tabs: ok");
