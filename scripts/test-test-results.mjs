import assert from "node:assert";
import {
  extractJson,
  parseBunJUnit,
  parseTestResults,
  summarize,
} from "../src/lib/test-results-core.ts";

const report = JSON.stringify({
  numTotalTests: 3,
  testResults: [
    {
      name: "/abs/math.test.ts",
      status: "failed",
      assertionResults: [
        { ancestorTitles: ["math"], title: "adds", status: "passed", failureMessages: [] },
        {
          ancestorTitles: ["math"],
          title: "breaks",
          status: "failed",
          failureMessages: ["Error: expected 2 to be 3"],
        },
        { ancestorTitles: [], title: "todo", status: "skipped", failureMessages: [] },
      ],
    },
  ],
});

const noisy = `stderr line from vitest\n${report}\nDone in 1.2s`;
assert.strictEqual(extractJson(noisy), report);

const results = parseTestResults(noisy);
assert.strictEqual(results.length, 3);
assert.strictEqual(results[0].status, "passed");
assert.strictEqual(results[1].status, "failed");
assert.strictEqual(results[1].fullName, "math › breaks");
assert.strictEqual(results[1].message, "Error: expected 2 to be 3");

assert.deepStrictEqual(summarize(results), { passed: 1, failed: 1, skipped: 1 });

assert.deepStrictEqual(parseTestResults("no json here"), []);
assert.deepStrictEqual(parseTestResults("{ broken"), []);

assert.deepStrictEqual(parseBunJUnit(`<testsuite><testcase name="works" classname="suite" /><testcase name="fails &amp; retries" classname="suite"><failure type="AssertionError" /></testcase><testcase name="later"><skipped /></testcase></testsuite>`).map((r) => [r.title, r.status]), [
  ["works", "passed"], ["fails & retries", "failed"], ["later", "skipped"],
]);

console.log("test-results: OK");
