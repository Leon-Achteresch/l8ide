export type Diagnostic = {
  message: string;
  severity: number;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  code?: string;
};

export type LintEdit = {
  title: string;
  range: Pick<Diagnostic, "startLineNumber" | "startColumn" | "endLineNumber" | "endColumn">;
  text: string;
  preferred: boolean;
};

export type LintFinding = { diagnostic: Diagnostic; fixes: LintEdit[] };

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

type EslintFix = { range?: [number, number]; text?: string };
type EslintMessage = {
  message: string;
  severity: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  ruleId?: string;
  fix?: EslintFix;
  suggestions?: Array<{ desc?: string; fix?: EslintFix }>;
};

function positionAt(source: string, offset: number) {
  const text = source.slice(0, Math.max(0, Math.min(offset, source.length)));
  const lines = text.split("\n");
  return { lineNumber: lines.length, column: lines[lines.length - 1]!.length + 1 };
}

function eslintEdit(source: string, fix: EslintFix | undefined, title: string, preferred: boolean): LintEdit | null {
  const span = fix?.range;
  if (!span || typeof fix?.text !== "string" || !Number.isInteger(span[0]) || !Number.isInteger(span[1]) || span[0] < 0 || span[1] < span[0] || span[1] > source.length) return null;
  const start = positionAt(source, span[0]);
  const end = positionAt(source, span[1]);
  return {
    title,
    range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
    text: fix.text,
    preferred,
  };
}

export function parseEslintFindings(output: string, source: string): LintFinding[] {
  const files = JSON.parse(output) as Array<{ messages?: EslintMessage[] }>;
  return files.flatMap((file) => (file.messages ?? []).map((message) => {
    const diagnostic = marker(message.message, message.severity === 2 ? 8 : 4,
      message.line ?? 1, message.column ?? 1, message.endLine, message.endColumn, message.ruleId);
    const fixes: LintEdit[] = [];
    const direct = eslintEdit(source, message.fix, `ESLint: ${message.ruleId ?? "Problem"} beheben`, true);
    if (direct) fixes.push(direct);
    for (const suggestion of message.suggestions ?? []) {
      const edit = eslintEdit(source, suggestion.fix, suggestion.desc ?? "ESLint-Vorschlag anwenden", false);
      if (edit) fixes.push(edit);
    }
    return { diagnostic, fixes };
  }));
}

export function parseEslintDiagnostics(output: string): Diagnostic[] {
  return parseEslintFindings(output, "").map((finding) => finding.diagnostic);
}

type BiomePoint = { line?: number; column?: number };
type BiomeRange = { start?: BiomePoint; end?: BiomePoint };
type BiomeDiagnostic = {
  message?: string;
  severity?: string;
  code?: { value?: string };
  location?: { range?: BiomeRange };
  suggestions?: Array<{ range?: BiomeRange; text?: string }>;
};

function biomeEdit(range: BiomeRange | undefined, text: string | undefined, title: string): LintEdit | null {
  if (!range?.start || !range.end || typeof text !== "string") return null;
  return {
    title,
    range: {
      startLineNumber: Math.max(1, range.start.line ?? 1),
      startColumn: Math.max(1, (range.start.column ?? 0) + 1),
      endLineNumber: Math.max(1, range.end.line ?? 1),
      endColumn: Math.max(1, (range.end.column ?? 0) + 1),
    },
    text,
    preferred: false,
  };
}

export function parseBiomeFindings(output: string): LintFinding[] {
  const report = JSON.parse(output) as { diagnostics?: BiomeDiagnostic[] };
  return (report.diagnostics ?? []).map((item) => {
    const start = item.location?.range?.start;
    const end = item.location?.range?.end;
    const diagnostic = marker(item.message ?? "Biome-Problem", item.severity === "ERROR" ? 8 : item.severity === "WARNING" ? 4 : 2,
      start?.line ?? 1, (start?.column ?? 0) + 1, end?.line, end?.column === undefined ? undefined : end.column + 1, item.code?.value);
    const fixes = (item.suggestions ?? []).flatMap((suggestion, index) => {
      const edit = biomeEdit(suggestion.range, suggestion.text, `Biome: ${item.code?.value ?? "Vorschlag"} (${index + 1})`);
      return edit ? [edit] : [];
    });
    return { diagnostic, fixes };
  });
}

export function parseBiomeDiagnostics(output: string): Diagnostic[] {
  return parseBiomeFindings(output).map((finding) => finding.diagnostic);
}
