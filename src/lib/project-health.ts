import { invoke } from "@tauri-apps/api/core";

export type TodoCounts = { todo: number; fixme: number; hack: number };

type SearchResponse = {
  files: Array<{ path: string; matches: Array<{ line: number; preview: string }> }>;
  total: number;
  truncated: boolean;
};

export async function scanTodos(root: string): Promise<TodoCounts> {
  const res = await invoke<SearchResponse>("search_in_files", {
    root,
    options: {
      query: "\\b(TODO|FIXME|HACK)\\b",
      caseSensitive: true,
      wholeWord: false,
      regex: true,
      include: "",
      exclude: "",
    },
  });
  const counts: TodoCounts = { todo: 0, fixme: 0, hack: 0 };
  for (const file of res.files) {
    for (const match of file.matches) {
      if (match.preview.includes("FIXME")) counts.fixme++;
      else if (match.preview.includes("HACK")) counts.hack++;
      else counts.todo++;
    }
  }
  return counts;
}
