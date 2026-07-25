import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const only = process.argv[2];

const files = readdirSync(here)
  .filter((f) => f.startsWith("test-") && f.endsWith(".mjs"))
  .filter((f) => !only || f.includes(only))
  .sort();

if (files.length === 0) {
  console.error(only ? `Kein Test passt auf "${only}"` : "Keine Tests gefunden");
  process.exit(1);
}

const failed = [];
for (const file of files) {
  const res = spawnSync(process.execPath, [join(here, file)], {
    encoding: "utf8",
  });
  if (res.status === 0) {
    process.stdout.write(".");
  } else {
    process.stdout.write("F");
    failed.push({ file, output: `${res.stdout ?? ""}${res.stderr ?? ""}`.trim() });
  }
}

process.stdout.write("\n");

for (const { file, output } of failed) {
  console.error(`\n\x1b[31mFAIL\x1b[0m ${file}\n${output}`);
}

console.log(
  `\n${files.length - failed.length}/${files.length} Tests bestanden${
    failed.length ? `, ${failed.length} fehlgeschlagen` : ""
  }`,
);

process.exit(failed.length ? 1 : 0);
