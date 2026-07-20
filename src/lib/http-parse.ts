export type HttpRequest = {
  method: string;
  url: string;
  headers: [string, string][];
  body: string;
  startLine: number;
  endLine: number;
  name: string;
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const REQUEST_LINE = new RegExp(`^(${METHODS.join("|")})\\s+(\\S+)`, "i");

export function parseHttpFile(source: string): HttpRequest[] {
  const lines = source.split("\n");
  const requests: HttpRequest[] = [];
  let current: HttpRequest | null = null;
  let inBody = false;
  let pendingName = "";

  const finish = (endLine: number) => {
    if (current) {
      current.body = current.body.replace(/\n+$/, "");
      current.endLine = endLine;
      requests.push(current);
      current = null;
    }
    inBody = false;
  };

  lines.forEach((raw, i) => {
    const line = raw.replace(/\r$/, "");
    const lineNo = i + 1;
    const trimmed = line.trim();

    if (trimmed.startsWith("###")) {
      finish(lineNo - 1);
      pendingName = trimmed.replace(/^#+/, "").trim();
      return;
    }
    if (!current && (trimmed.startsWith("#") || trimmed.startsWith("//"))) {
      const m = /^(?:#|\/\/)\s*@name\s+(.+)$/.exec(trimmed);
      if (m) pendingName = m[1].trim();
      return;
    }
    const reqMatch = REQUEST_LINE.exec(trimmed);
    if (reqMatch && !inBody) {
      finish(lineNo - 1);
      current = {
        method: reqMatch[1].toUpperCase(),
        url: reqMatch[2],
        headers: [],
        body: "",
        startLine: lineNo,
        endLine: lineNo,
        name: pendingName || `${reqMatch[1].toUpperCase()} ${reqMatch[2]}`,
      };
      pendingName = "";
      return;
    }
    if (!current) return;
    if (!inBody) {
      if (trimmed === "") {
        inBody = true;
        return;
      }
      const h = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
      if (h) current.headers.push([h[1], h[2]]);
    } else {
      current.body += `${line}\n`;
    }
  });
  finish(lines.length);
  return requests;
}

export function requestAtLine(
  requests: HttpRequest[],
  line: number,
): HttpRequest | null {
  return (
    requests.find((r) => line >= r.startLine && line <= r.endLine) ??
    requests.find((r) => r.startLine >= line) ??
    requests[requests.length - 1] ??
    null
  );
}

export function interpolate(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (whole, key: string) =>
    key in vars ? vars[key] : whole,
  );
}

export function applyEnv(
  req: HttpRequest,
  vars: Record<string, string>,
): HttpRequest {
  return {
    ...req,
    url: interpolate(req.url, vars),
    headers: req.headers.map(([k, v]) => [k, interpolate(v, vars)]),
    body: interpolate(req.body, vars),
  };
}

export function missingVars(
  req: HttpRequest,
  vars: Record<string, string>,
): string[] {
  const text = `${req.url}\n${req.headers.map(([k, v]) => `${k}:${v}`).join("\n")}\n${req.body}`;
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)) {
    if (!(m[1] in vars)) found.add(m[1]);
  }
  return [...found];
}

export function toCurlArgs(req: HttpRequest): string[] {
  const args = ["-sS", "-i", "-X", req.method];
  for (const [k, v] of req.headers) args.push("-H", `${k}: ${v}`);
  if (req.body.trim()) args.push("--data-raw", req.body);
  args.push(req.url);
  return args;
}
