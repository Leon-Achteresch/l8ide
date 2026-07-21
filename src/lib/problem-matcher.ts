export type TaskProblem = {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
};

const ANSI = /\x1b(?:\[[0-9;?]*[a-zA-Z]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI, "");
}

const TSC_PAREN =
  /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;
const TSC_COLON =
  /^(.+?):(\d+):(\d+)\s+-\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

export function parseTscLine(line: string): TaskProblem | null {
  const m = TSC_PAREN.exec(line) ?? TSC_COLON.exec(line);
  if (!m) return null;
  const [, file, l, c, severity, code, message] = m;
  return {
    file: file.trim(),
    line: parseInt(l, 10),
    column: parseInt(c, 10),
    severity: severity as "error" | "warning",
    message: `${message.trim()} (${code})`,
  };
}

const ESLINT_COMPACT =
  /^(.+?):\s+line\s+(\d+),\s+col\s+(\d+),\s+(Error|Warning)\s+-\s+(.+?)(?:\s+\(([\w-]+(?:\/[\w-]+)*)\))?$/i;
const GENERIC =
  /^(.+?):(\d+):(\d+):\s+(error|warning|fatal error)\s*:?\s+(.+)$/i;

export function parseProblemLine(line: string): TaskProblem | null {
  const tsc = parseTscLine(line);
  if (tsc) return tsc;

  let m = ESLINT_COMPACT.exec(line);
  if (m) {
    const [, file, l, c, sev, msg, rule] = m;
    return {
      file: file.trim(),
      line: parseInt(l, 10),
      column: parseInt(c, 10),
      severity: sev.toLowerCase() === "error" ? "error" : "warning",
      message: rule ? `${msg.trim()} (${rule})` : msg.trim(),
    };
  }

  m = GENERIC.exec(line);
  if (m) {
    const [, file, l, c, sev, msg] = m;
    return {
      file: file.trim(),
      line: parseInt(l, 10),
      column: parseInt(c, 10),
      severity: sev.toLowerCase().startsWith("warn") ? "warning" : "error",
      message: msg.trim(),
    };
  }
  return null;
}

const STYLISH_FILE =
  /^(\S+\.(?:[jt]sx?|mjs|cjs|vue|svelte|astro|css|scss|less|json))$/;
const STYLISH_PROBLEM =
  /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s{2,}([\w-]+(?:\/[\w-]+)*))?\s*$/;

export function parseStylishFile(rawLine: string): string | null {
  if (/^\s/.test(rawLine)) return null;
  const m = STYLISH_FILE.exec(rawLine.trim());
  return m ? m[1] : null;
}

export function parseStylishProblem(
  rawLine: string,
): Omit<TaskProblem, "file"> | null {
  const m = STYLISH_PROBLEM.exec(rawLine);
  if (!m) return null;
  const [, l, c, sev, msg, rule] = m;
  return {
    line: parseInt(l, 10),
    column: parseInt(c, 10),
    severity: sev === "error" ? "error" : "warning",
    message: rule ? `${msg.trim()} (${rule})` : msg.trim(),
  };
}

export function isCompileRestart(line: string): boolean {
  return (
    line.includes("File change detected. Starting incremental compilation") ||
    line.includes("Starting compilation in watch mode")
  );
}

export function isCleanCompile(line: string): boolean {
  return /Found 0 errors\./.test(line);
}
