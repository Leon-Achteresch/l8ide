export type LaunchConfig = {
  name: string;
  program: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
};

export type LaunchContext = {
  workspaceFolder: string;
  file: string | null;
  env?: Record<string, string>;
};

export function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
      continue;
    }
    if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inString) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

export function parseLaunchConfigs(text: string): LaunchConfig[] {
  let data: unknown;
  try {
    data = JSON.parse(stripJsonComments(text));
  } catch {
    return [];
  }
  const raw = Array.isArray(data)
    ? data
    : ((data as { configurations?: unknown }).configurations ?? []);
  if (!Array.isArray(raw)) return [];
  const configs: LaunchConfig[] = [];
  for (const item of raw) {
    const c = item as Record<string, unknown>;
    if (typeof c.name !== "string" || typeof c.program !== "string") continue;
    configs.push({
      name: c.name,
      program: c.program,
      args: Array.isArray(c.args) ? c.args.map(String) : undefined,
      cwd: typeof c.cwd === "string" ? c.cwd : undefined,
      env:
        c.env && typeof c.env === "object"
          ? Object.fromEntries(
              Object.entries(c.env as Record<string, unknown>).map(([k, v]) => [
                k,
                String(v),
              ]),
            )
          : undefined,
    });
  }
  return configs;
}

function basename(p: string): string {
  return p.replace(/\/+$/, "").split("/").pop() ?? p;
}

export function substituteVars(input: string, ctx: LaunchContext): string {
  const file = ctx.file ?? "";
  const root = ctx.workspaceFolder.replace(/\/+$/, "");
  const rel =
    file && file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file;
  const map: Record<string, string> = {
    workspaceFolder: root,
    workspaceFolderBasename: basename(root),
    file,
    relativeFile: rel,
    fileBasename: basename(file),
    fileBasenameNoExtension: basename(file).replace(/\.[^.]+$/, ""),
    fileDirname: file.replace(/\/[^/]*$/, ""),
    cwd: root,
  };
  return input.replace(/\$\{(\w+)(?::([^}]*))?\}/g, (whole, name, arg) => {
    if (name === "env") return ctx.env?.[arg] ?? "";
    return map[name] ?? whole;
  });
}
