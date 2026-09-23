export type Diagnostic = {
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  code?: string;
};

export function marker(message: string, severity: number, line: number, column: number, endLine?: number, endColumn?: number, code?: string): Diagnostic {
  const startLineNumber = Math.max(1, line);
  const startColumn = Math.max(1, column);
  const endLineNumber = Math.max(startLineNumber, endLine ?? startLineNumber);
  return {
    message,
    severity,
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn: endLineNumber === startLineNumber
      ? Math.max(startColumn + 1, endColumn ?? startColumn + 1)
      : Math.max(1, endColumn ?? 1),
    code,
  };
}

export function parseEslintDiagnostics(output: string): Diagnostic[] {
  const files = JSON.parse(output) as Array<{ messages?: Array<{ message: string; severity: number; line?: number; column?: number; endLine?: number; endColumn?: number; ruleId?: string }> }>;
  return files.flatMap((file) => (file.messages ?? []).map((m) => marker(
    m.message, m.severity === 2 ? 8 : 4, m.line ?? 1, m.column ?? 1, m.endLine, m.endColumn, m.ruleId,
  )));
}

export function parseBiomeDiagnostics(output: string): Diagnostic[] {
  const report = JSON.parse(output) as { diagnostics?: Array<{
    message?: string;
    severity?: string;
    code?: { value?: string };
    location?: { range?: { start?: { line?: number; column?: number }; end?: { line?: number; column?: number } } };
  }> };
  return (report.diagnostics ?? []).map((d) => {
    const start = d.location?.range?.start;
    const end = d.location?.range?.end;
    return marker(d.message ?? "Biome-Problem", d.severity === "ERROR" ? 8 : d.severity === "WARNING" ? 4 : 2,
      start?.line ?? 1, (start?.column ?? 0) + 1, end?.line, end?.column === undefined ? undefined : end.column + 1, d.code?.value);
  });
}
