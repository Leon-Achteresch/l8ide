import { invoke } from "@tauri-apps/api/core";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";

export type TodoCounts = { todo: number; fixme: number; hack: number };

type ShellResult = { stdout: string; stderr: string; code: number | null };

export type NodeEnv = {
  required: string | null;
  running: string | null;
  ok: boolean;
};

function majorOf(v: string): string | null {
  const m = /(\d+)/.exec(v);
  return m ? m[1] : null;
}

export async function checkNodeEnv(root: string): Promise<NodeEnv> {
  let required: string | null = null;
  const nvmrc = `${root}/.nvmrc`;
  if (await exists(nvmrc).catch(() => false)) {
    required = (await readTextFile(nvmrc).catch(() => "")).trim() || null;
  }
  if (!required) {
    const pkg = `${root}/package.json`;
    if (await exists(pkg).catch(() => false)) {
      try {
        const json = JSON.parse(await readTextFile(pkg)) as {
          engines?: { node?: string };
        };
        required = json.engines?.node ?? null;
      } catch {
        required = null;
      }
    }
  }
  let running: string | null = null;
  const res = await invoke<ShellResult>("run_shell", {
    cwd: root,
    command: "node -v",
    timeoutMs: 5000,
  }).catch(() => null);
  if (res?.stdout.trim()) running = res.stdout.trim().replace(/^v/, "");

  let ok = true;
  if (required && running) {
    const reqMajor = majorOf(required);
    const runMajor = majorOf(running);
    if (reqMajor && runMajor) ok = reqMajor === runMajor;
  }
  return { required, running, ok };
}

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
