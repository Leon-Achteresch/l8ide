import { clearTaskMarkers, setTaskMarkers } from "@/lib/markers-store";
import {
  isCleanCompile,
  isCompileRestart,
  parseTscLine,
  stripAnsi,
  type TaskProblem,
} from "@/lib/problem-matcher";
import { useWorkspaceStore } from "@/lib/workspace-store";

const MAX_PROBLEMS = 200;

type Scanner = {
  partial: string;
  problems: TaskProblem[];
  timer: ReturnType<typeof setTimeout> | undefined;
};

const scanners = new Map<number, Scanner>();

function resolvePath(file: string, cwd: string | null): string {
  if (file.startsWith("/")) return file;
  const base = cwd ?? useWorkspaceStore.getState().rootPath;
  return base ? `${base.replace(/\/+$/, "")}/${file}` : file;
}

function flushSoon(pane: number, s: Scanner) {
  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    setTaskMarkers(
      pane,
      s.problems.map((p) => ({
        path: p.file,
        line: p.line,
        column: p.column,
        severity: p.severity,
        message: p.message,
      })),
    );
  }, 300);
}

export function feedTaskProblems(
  pane: number,
  data: string,
  cwd: string | null,
) {
  const s = scanners.get(pane) ?? {
    partial: "",
    problems: [],
    timer: undefined,
  };
  scanners.set(pane, s);
  const text = s.partial + stripAnsi(data);
  const lines = text.split(/\r?\n/);
  s.partial = lines.pop() ?? "";
  let changed = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (isCompileRestart(line) || isCleanCompile(line)) {
      if (s.problems.length > 0) changed = true;
      s.problems = [];
      continue;
    }
    const problem = parseTscLine(line);
    if (problem && s.problems.length < MAX_PROBLEMS) {
      s.problems.push({ ...problem, file: resolvePath(problem.file, cwd) });
      changed = true;
    }
  }
  if (changed) flushSoon(pane, s);
}

export function disposeTaskProblems(pane: number) {
  const s = scanners.get(pane);
  if (s) clearTimeout(s.timer);
  scanners.delete(pane);
  clearTaskMarkers(pane);
}
