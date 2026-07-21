import { isTestFile } from "./test-lens-core.ts";

export function filesToRerun(
  savedPath: string,
  knownTestPaths: string[],
): string[] {
  const set = new Set(knownTestPaths);
  if (isTestFile(savedPath)) set.add(savedPath);
  return [...set];
}
