export type TestStatus = "passed" | "failed" | "skipped" | "pending";

export type TestResult = {
  title: string;
  fullName: string;
  status: TestStatus;
  message?: string;
};

export function extractJson(stdout: string): string | null {
  const trimmed = stdout.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  return start >= 0 && end > start ? stdout.slice(start, end + 1) : null;
}

export function parseTestResults(stdout: string): TestResult[] {
  const json = extractJson(stdout);
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const suites = (data as { testResults?: unknown }).testResults;
  if (!Array.isArray(suites)) return [];
  const results: TestResult[] = [];
  for (const suite of suites) {
    const asserts = (suite as { assertionResults?: unknown }).assertionResults;
    if (!Array.isArray(asserts)) continue;
    for (const a of asserts) {
      const r = a as {
        title?: unknown;
        status?: unknown;
        ancestorTitles?: unknown;
        failureMessages?: unknown;
      };
      if (typeof r.title !== "string" || typeof r.status !== "string") continue;
      const ancestors = Array.isArray(r.ancestorTitles)
        ? r.ancestorTitles.map(String)
        : [];
      const msg = Array.isArray(r.failureMessages)
        ? r.failureMessages.map(String).join("\n")
        : undefined;
      results.push({
        title: r.title,
        fullName: [...ancestors, r.title].join(" › "),
        status: r.status as TestStatus,
        message: msg || undefined,
      });
    }
  }
  return results;
}

export function summarize(results: TestResult[]): {
  passed: number;
  failed: number;
  skipped: number;
} {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.status === "passed") passed++;
    else if (r.status === "failed") failed++;
    else skipped++;
  }
  return { passed, failed, skipped };
}
