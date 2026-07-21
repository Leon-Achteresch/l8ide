import {
  stripJsonComments,
  substituteVars,
  type LaunchContext,
} from "./launch-config-core.ts";
import { sq } from "./shell-quote.ts";

export type Task = {
  label: string;
  command: string;
  args?: string[];
  cwd?: string;
  isBackground?: boolean;
};

export function parseTasks(text: string): Task[] {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonComments(text));
  } catch {
    return [];
  }
  const raw = (data as { tasks?: unknown }).tasks;
  if (!Array.isArray(raw)) return [];
  const tasks: Task[] = [];
  for (const item of raw) {
    const t = item as Record<string, unknown>;
    if (typeof t.command !== "string") continue;
    const label =
      typeof t.label === "string"
        ? t.label
        : typeof t.type === "string"
          ? `${t.type}: ${t.command}`
          : t.command;
    const opts = t.options as { cwd?: unknown } | undefined;
    tasks.push({
      label,
      command: t.command,
      args: Array.isArray(t.args) ? t.args.map(String) : undefined,
      cwd:
        typeof t.cwd === "string"
          ? t.cwd
          : typeof opts?.cwd === "string"
            ? opts.cwd
            : undefined,
      isBackground: t.isBackground === true,
    });
  }
  return tasks;
}

export function buildTaskCommand(task: Task, ctx: LaunchContext): string {
  const cmd = substituteVars(task.command, ctx);
  const args = (task.args ?? []).map((a) => sq(substituteVars(a, ctx)));
  const full = [cmd, ...args].join(" ");
  const cwd = task.cwd ? substituteVars(task.cwd, ctx) : null;
  return cwd ? `cd ${sq(cwd)} && ${full}` : full;
}
