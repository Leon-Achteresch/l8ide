function escapeChar(c: string): string {
  return /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
}

function escapeLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compile(glob: string): string {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i += 2;
        if (glob[i] === "/") {
          re += "(?:.*/)?";
          i++;
        } else {
          re += ".*";
        }
        continue;
      }
      re += "[^/]*";
      i++;
      continue;
    }
    if (c === "?") {
      re += "[^/]";
      i++;
      continue;
    }
    if (c === "{") {
      const end = glob.indexOf("}", i);
      if (end > i) {
        const parts = glob
          .slice(i + 1, end)
          .split(",")
          .map(escapeLiteral);
        re += `(?:${parts.join("|")})`;
        i = end + 1;
        continue;
      }
    }
    re += escapeChar(c);
    i++;
  }
  return re;
}

export function globToRegExp(glob: string): RegExp {
  const body = compile(glob);
  return new RegExp(glob.includes("/") ? `^${body}$` : `(?:^|/)${body}$`);
}

export function matchesAnyGlob(relPath: string, globs: string[]): boolean {
  return globs.some((g) => {
    try {
      return globToRegExp(g).test(relPath);
    } catch {
      return false;
    }
  });
}
