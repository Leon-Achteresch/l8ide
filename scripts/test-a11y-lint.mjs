import assert from "node:assert/strict";
import { lintA11y } from "../src/lib/a11y-lint-core.ts";

const jsx = `
export function C() {
  return (
    <div>
      <img src="a.png" />
      <img src="b.png" alt="ok" />
      <a href="#">klick</a>
      <a href="/real">ok</a>
      <div onClick={go}>tap</div>
      <button onClick={go}>ok</button>
      <span tabindex="3">x</span>
    </div>
  );
}
`;

const f = lintA11y(jsx);
const msgs = f.map((x) => x.message);

assert.ok(msgs.some((m) => m.includes("<img> ohne alt")));
assert.equal(msgs.filter((m) => m.includes("ohne alt")).length, 1);
assert.ok(msgs.some((m) => m.includes("leerem href")));
assert.ok(msgs.some((m) => m.includes("onClick auf <div>")));
assert.ok(!msgs.some((m) => m.includes("onClick auf <button>")));
assert.ok(msgs.some((m) => m.includes("Positiver tabindex (3)")));

// each finding has a valid line
for (const x of f) assert.ok(x.line >= 1 && x.column >= 1);

assert.equal(lintA11y("<img alt='' src='x'/>").length, 0);
assert.equal(lintA11y("const x = 1;").length, 0);

console.log(`test-a11y-lint: ok (${f.length} Funde)`);
