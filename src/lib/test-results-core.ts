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

function xmlAttribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return (match?.[1] ?? "").replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (entity) => {
    const known: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
    if (known[entity]) return known[entity];
    if (entity.startsWith("&#")) {
      const hex = entity[2]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      if (Number.isInteger(code) && code >= 0 && code <= 0x10ffff) return String.fromCodePoint(code);
    }
    return entity;
  });
}

export function parseBunJUnit(xml: string): TestResult[] {
  const results: TestResult[] = [];
  for (const match of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const title = xmlAttribute(match[1], "name");
    if (!title) continue;
    const suite = xmlAttribute(match[1], "classname");
    const body = match[2] ?? "";
    const failure = body.match(/<(?:failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:failure|error)>)/);
    const skipped = /<skipped\b/.test(body);
    results.push({
      title,
      fullName: suite ? `${suite} › ${title}` : title,
      status: failure ? "failed" : skipped ? "skipped" : "passed",
      message: failure ? xmlAttribute(failure[1], "message") || failure[2]?.trim() || undefined : undefined,
    });
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
