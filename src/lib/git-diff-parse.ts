export type GutterKind = "add" | "modify" | "delete";
export type GutterRange = {
  start: number;
  end: number;
  kind: GutterKind;
  oldLines: string[];
};

export function parseDiffRanges(diff: string): GutterRange[] {
  const ranges: GutterRange[] = [];
  let newLine = 0;
  let addStart = 0;
  let addCount = 0;
  let delCount = 0;
  let oldBuf: string[] = [];

  function flush() {
    if (addCount === 0 && delCount === 0) return;
    if (addCount === 0) {
      const line = Math.max(1, newLine);
      ranges.push({ start: line, end: line, kind: "delete", oldLines: oldBuf });
    } else {
      ranges.push({
        start: addStart,
        end: addStart + addCount - 1,
        kind: delCount > 0 ? "modify" : "add",
        oldLines: oldBuf,
      });
    }
    addCount = 0;
    delCount = 0;
    oldBuf = [];
  }

  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) {
      flush();
      const m = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      newLine = m ? parseInt(m[1], 10) : 1;
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("\\")) continue;
    if (line.startsWith("+")) {
      if (addCount === 0) addStart = newLine;
      addCount++;
      newLine++;
    } else if (line.startsWith("-")) {
      delCount++;
      oldBuf.push(line.slice(1));
    } else {
      flush();
      newLine++;
    }
  }
  flush();
  return ranges;
}
