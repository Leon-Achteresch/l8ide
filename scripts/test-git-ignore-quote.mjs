import assert from "node:assert";
import { execSync } from "node:child_process";
import { sq } from "../src/lib/shell-quote.ts";

assert.strictEqual(sq("src"), "'src'");
assert.strictEqual(sq("weird name.txt"), "'weird name.txt'");
assert.strictEqual(sq("READ'ME"), "'READ'\\''ME'");

const tricky = ["a b", "x'y", "$HOME", "`id`", ";rm -rf .", "*.log"];
for (const name of tricky) {
  const echoed = execSync(`printf '%s' ${sq(name)}`).toString();
  assert.strictEqual(echoed, name, `sq round-trip failed for ${name}`);
}

console.log("git-ignore-quote: OK");
