import assert from "node:assert/strict";
import {
  extractTokens,
  resolveColor,
} from "../src/lib/design-tokens-core.ts";

const css = `
:root {
  --bg: oklch(0.985 0.002 265);
  --accent: #3b82f6;
  --radius: 8px;
  --brand: var(--accent);
  --space-2: 0.5rem;
}
.dark { --bg: #101014; }
`;

const tokens = extractTokens(css);
const byName = new Map(tokens.map((t) => [t.name, t.value]));

assert.ok(tokens.some((t) => t.name === "--accent" && t.isColor));
assert.ok(tokens.find((t) => t.name === "--bg").isColor);
assert.equal(byName.get("--radius"), "8px");
assert.equal(
  tokens.find((t) => t.name === "--radius").isColor,
  false,
);
assert.equal(tokens.find((t) => t.name === "--space-2").isColor, false);

// last definition wins (dark overrides)
assert.equal(byName.get("--bg"), "#101014");

assert.equal(resolveColor("var(--accent)", byName), "#3b82f6");
assert.equal(resolveColor("var(--brand)", byName), "#3b82f6");
assert.equal(resolveColor("#fff", byName), "#fff");

console.log(`test-design-tokens: ok (${tokens.length} Tokens)`);
