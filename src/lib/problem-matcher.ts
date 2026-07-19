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

export function isCompileRestart(line: string): boolean {
  return (
    line.includes("File change detected. Starting incremental compilation") ||
    line.includes("Starting compilation in watch mode")
  );
}

export function isCleanCompile(line: string): boolean {
  return /Found 0 errors\./.test(line);
}
