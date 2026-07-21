import {
  stripJsonComments,
  substituteVars,
  type LaunchContext,
} from "./launch-config-core.ts";
import { sq } from "./shell-quote.ts";

export type Task = {
  label: string;
  command?: string;
  args?: string[];
  cwd?: string;
  isBackground?: boolean;
  dependsOn?: string[];
  dependsOrder?: "parallel" | "sequence";
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
    const hasCommand = typeof t.command === "string";
    const dependsOn = Array.isArray(t.dependsOn)
      ? t.dependsOn.map(String)
      : typeof t.dependsOn === "string"
        ? [t.dependsOn]
        : undefined;
    if (!hasCommand && !dependsOn) continue;
    const label =
      typeof t.label === "string"
        ? t.label
        : hasCommand && typeof t.type === "string"
          ? `${t.type}: ${t.command as string}`
          : hasCommand
            ? (t.command as string)
            : null;
    if (!label) continue;
    const opts = t.options as { cwd?: unknown } | undefined;
    tasks.push({
      label,
      command: hasCommand ? (t.command as string) : undefined,
      args: Array.isArray(t.args) ? t.args.map(String) : undefined,
      cwd:
        typeof t.cwd === "string"
          ? t.cwd
          : typeof opts?.cwd === "string"
            ? opts.cwd
            : undefined,
      isBackground: t.isBackground === true,
      dependsOn,
      dependsOrder: t.dependsOrder === "sequence" ? "sequence" : undefined,
    });
  }
  return tasks;
}

export function resolveTaskCommands(
  task: Task,
  byLabel: Map<string, Task>,
  ctx: LaunchContext,
  seen: Set<string> = new Set(),
): string {
  if (seen.has(task.label)) return "";
  const nextSeen = new Set(seen);
  nextSeen.add(task.label);
  const deps = (task.dependsOn ?? [])
    .map((l) => byLabel.get(l))
    .filter((t): t is Task => Boolean(t))
    .map((t) => resolveTaskCommands(t, byLabel, ctx, nextSeen))
    .filter(Boolean);
  let depStr = "";
  if (deps.length) {
    depStr =
      task.dependsOrder === "sequence"
        ? deps.join(" && ")
        : `${deps.map((d) => `{ ${d}; }`).join(" & ")} & wait`;
  }
  const own = task.command ? buildTaskCommand(task, ctx) : "";
  return [depStr, own].filter(Boolean).join(" && ");
}

export function buildTaskCommand(task: Task, ctx: LaunchContext): string {
  if (!task.command) return "";
  const cmd = substituteVars(task.command, ctx);
  const args = (task.args ?? []).map((a) => sq(substituteVars(a, ctx)));
  const full = [cmd, ...args].join(" ");
  const cwd = task.cwd ? substituteVars(task.cwd, ctx) : null;
  return cwd ? `cd ${sq(cwd)} && ${full}` : full;
}
