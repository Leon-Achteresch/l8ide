import assert from "node:assert";
import {
  buildTestCommand,
  findTestCases,
  isTestFile,
} from "../src/lib/test-lens-core.ts";

const src = `import { describe, it, test } from "vitest";

describe("math", () => {
  it("adds", () => { expect(1 + 1).toBe(2); });
  it.only("subtracts", () => {});
});

test("standalone", () => {});
const label = "it should not match in a string";
`;

const cases = findTestCases(src);
assert.deepStrictEqual(
  cases.map((c) => [c.kind, c.title, c.line]),
  [
    ["describe", "math", 3],
    ["it", "adds", 4],
    ["it", "subtracts", 5],
    ["test", "standalone", 8],
  ],
);

assert.ok(isTestFile("src/foo.test.ts"));
assert.ok(isTestFile("a/b.spec.tsx"));
assert.ok(!isTestFile("src/foo.ts"));

assert.strictEqual(
  buildTestCommand("vitest", "src/a.test.ts", "adds"),
  "npx vitest run 'src/a.test.ts' -t 'adds'",
);
assert.strictEqual(
  buildTestCommand("jest", "src/a.test.ts"),
  "npx jest 'src/a.test.ts'",
);
assert.strictEqual(
  buildTestCommand("vitest", "src/a.test.ts", "renders ${x}"),
  "npx vitest run 'src/a.test.ts'",
);

console.log("test-lens: OK");
