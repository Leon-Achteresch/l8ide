import assert from "node:assert";

function hitCountCondition(key, count) {
  const k = JSON.stringify(key);
  const g = "(globalThis.__l8hc||(globalThis.__l8hc={}))";
  return `(${g}[${k}]=(${g}[${k}]||0)+1)>=${count}`;
}

const cond = hitCountCondition("a:12", 3);
const results = [];
for (let i = 0; i < 6; i++) results.push(eval(cond));
assert.deepStrictEqual(results, [false, false, true, true, true, true]);

const other = hitCountCondition("b:7", 2);
assert.strictEqual(eval(other), false);
assert.strictEqual(eval(other), true);
assert.strictEqual(eval(cond), true);

console.log("hitcount: OK");
