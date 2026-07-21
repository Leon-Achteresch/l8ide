type HttpReqLike = {
  method: string;
  url: string;
  headers: [string, string][];
  body: string;
};

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function httpToCurl(req: HttpReqLike): string {
  const parts = ["curl"];
  if (req.method && req.method !== "GET") {
    parts.push("-X", req.method);
  }
  for (const [k, v] of req.headers) {
    parts.push("-H", shellQuote(`${k}: ${v}`));
  }
  if (req.body.trim()) {
    parts.push("--data-raw", shellQuote(req.body));
  }
  parts.push(shellQuote(req.url));
  return parts.join(" ");
}

function tokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const s = cmd.trim().replace(/\\\r?\n/g, " ");
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    let tok = "";
    while (i < s.length && !/\s/.test(s[i])) {
      const c = s[i];
      if (c === '"' || c === "'") {
        const quote = c;
        i++;
        while (i < s.length && s[i] !== quote) {
          if (s[i] === "\\" && quote === '"' && i + 1 < s.length) {
            tok += s[i + 1];
            i += 2;
          } else {
            tok += s[i++];
          }
        }
        i++;
      } else {
        tok += c;
        i++;
      }
    }
    tokens.push(tok);
  }
  return tokens;
}

export function curlToHttp(command: string): string {
  const tokens = tokenize(command);
  if (tokens[0] !== "curl") throw new Error("Kein curl-Befehl");
  let method = "";
  let url = "";
  const headers: [string, string][] = [];
  let body = "";
  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "-X" || t === "--request") {
      method = tokens[++i]?.toUpperCase() ?? "";
    } else if (t === "-H" || t === "--header") {
      const h = tokens[++i] ?? "";
      const idx = h.indexOf(":");
      if (idx > 0) headers.push([h.slice(0, idx).trim(), h.slice(idx + 1).trim()]);
    } else if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary"
    ) {
      body = tokens[++i] ?? "";
    } else if (t === "-u" || t === "--user") {
      const cred = tokens[++i] ?? "";
      headers.push(["Authorization", `Basic ${btoa(cred)}`]);
    } else if (t === "--url") {
      url = tokens[++i] ?? "";
    } else if (!t.startsWith("-") && !url) {
      url = t;
    }
  }
  if (!url) throw new Error("Keine URL im curl-Befehl gefunden");
  if (!method) method = body ? "POST" : "GET";

  const lines = [`${method} ${url}`];
  for (const [k, v] of headers) lines.push(`${k}: ${v}`);
  if (body) lines.push("", body);
  return lines.join("\n");
}
