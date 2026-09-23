import { sq } from "./shell-quote.ts";

export type TestCase = {
  kind: "describe" | "it" | "test";
  title: string;
  line: number;
};

export type TestTool = "vitest" | "jest" | "bun" | "npm";

const TEST_RE =
  /(?:^|[\s;{])(describe|it|test)(?:\.(?:only|skip|concurrent|sequential|each))?\s*\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;

export function findTestCases(text: string): TestCase[] {
  const cases: TestCase[] = [];
  let m: RegExpExecArray | null;
  TEST_RE.lastIndex = 0;
  while ((m = TEST_RE.exec(text))) {
    const before = text.slice(0, m.index + m[0].indexOf(m[1]));
    const line = before.split("\n").length;
    cases.push({
      kind: m[1] as TestCase["kind"],
      title: m[3].replace(/\\(['"`])/g, "$1"),
      line,
    });
  }
  return cases;
}

export function isTestFile(path: string): boolean {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
}

export function buildTestCommand(
  tool: TestTool,
  relFile: string,
  title?: string,
): string {
  const file = sq(relFile);
  const filter = title && !title.includes("${") ? ` -t ${sq(title)}` : "";
  if (tool === "vitest") return `npx vitest run ${file}${filter}`;
  if (tool === "jest") return `npx jest ${file}${filter}`;
  if (tool === "bun") return `bun test ${sq(relFile.startsWith("./") ? relFile : `./${relFile}`)}${filter}`;
  return title ? `npm test -- ${file}${filter}` : `npm test -- ${file}`;
}
