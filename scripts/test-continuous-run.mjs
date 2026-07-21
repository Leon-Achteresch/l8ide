import assert from "node:assert";
import { filesToRerun } from "../src/lib/continuous-run-core.ts";

const known = ["/p/a.test.ts", "/p/b.spec.ts"];

// saving a source file → re-run only the already-run test files
assert.deepStrictEqual(filesToRerun("/p/src/x.ts", known).sort(), [
  "/p/a.test.ts",
  "/p/b.spec.ts",
]);

// saving a test file that is already known → no duplicate
assert.deepStrictEqual(filesToRerun("/p/a.test.ts", known).sort(), [
  "/p/a.test.ts",
  "/p/b.spec.ts",
]);

// saving a NEW test file → added
assert.deepStrictEqual(filesToRerun("/p/c.test.tsx", known).sort(), [
  "/p/a.test.ts",
  "/p/b.spec.ts",
  "/p/c.test.tsx",
]);

// no known tests, saving a source file → nothing to run
assert.deepStrictEqual(filesToRerun("/p/src/x.ts", []), []);

// no known tests, saving a test file → run it
assert.deepStrictEqual(filesToRerun("/p/new.test.js", []), ["/p/new.test.js"]);

console.log("continuous-run: OK");
