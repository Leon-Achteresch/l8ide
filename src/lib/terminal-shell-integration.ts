import type { IDecoration, IMarker, Terminal } from "@xterm/xterm";

export type QuickFix = {
  id: string;
  label: string;
  run: string;
};

export type CommandEntry = {
  promptMarker: IMarker | null;
  commandMarker: IMarker | null;
  command: string;
  exitCode: number | null;
  cwd: string | null;
  decoration: IDecoration | null;
};

export type IntegrationState = {
  cwd: string | null;
  sticky: { command: string; failed: boolean } | null;
  quickFixes: QuickFix[];
  history: string[];
};

const MAX_ENTRIES = 1000;

function unescape(s: string): string {
  return s.replace(/\\x3b/g, ";");
}

function detectQuickFixes(output: string, command: string): QuickFix[] {
  const fixes: QuickFix[] = [];
  const port = output.match(
    /(?:EADDRINUSE|address already in use|listen[^\n]*?)(?::| )(\d{2,5})\b/i,
  );
  if (port) {
    const p = port[1];
    fixes.push({
      id: `port-${p}`,
      label: `Prozess auf Port ${p} beenden`,
      run: `lsof -ti:${p} | xargs kill -9`,
    });
  }
  const upstream = output.match(/git push --set-upstream (\S+) (\S+)/);
  if (upstream) {
    fixes.push({
      id: "git-upstream",
      label: `git push --set-upstream ${upstream[1]} ${upstream[2]}`,
      run: `git push --set-upstream ${upstream[1]} ${upstream[2]}`,
    });
  } else {
    const noUpstream = output.match(
      /current branch (\S+) has no upstream branch/i,
    );
    if (noUpstream) {
      fixes.push({
        id: "git-upstream",
        label: `git push --set-upstream origin ${noUpstream[1]}`,
        run: `git push --set-upstream origin ${noUpstream[1]}`,
      });
    }
  }
  const notGitRepo = /not a git repository/i.test(output);
  if (notGitRepo && /^git\b/.test(command.trim())) {
    fixes.push({ id: "git-init", label: "git init", run: "git init" });
  }
  return fixes;
}

export class ShellIntegration {
  private entries: CommandEntry[] = [];
  private current: CommandEntry | null = null;
  private listeners = new Set<() => void>();
  private state: IntegrationState = {
    cwd: null,
    sticky: null,
    quickFixes: [],
    history: [],
  };

  constructor(private term: Terminal) {
    term.parser.registerOscHandler(633, (data) => this.handle633(data));
    term.parser.registerOscHandler(7, (data) => this.handleCwd(data));
    term.onScroll(() => this.updateSticky());
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getState = (): IntegrationState => this.state;

  private emit() {
    for (const cb of this.listeners) cb();
  }

  private set(patch: Partial<IntegrationState>) {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private handleCwd(data: string): boolean {
    const path = data.replace(/^file:\/\/[^/]*/, "");
    if (path) this.set({ cwd: decodeURIComponent(path) });
    return true;
  }

  private handle633(data: string): boolean {
    const sep = data.indexOf(";");
    const kind = sep === -1 ? data : data.slice(0, sep);
    const arg = sep === -1 ? "" : data.slice(sep + 1);
    switch (kind) {
      case "A": {
        this.current = {
          promptMarker: this.term.registerMarker(0),
          commandMarker: null,
          command: "",
          exitCode: null,
          cwd: this.state.cwd,
          decoration: null,
        };
        break;
      }
      case "E":
        if (this.current) this.current.command = unescape(arg.split(";")[0] ?? "");
        break;
      case "C":
        if (this.current && !this.current.commandMarker) {
          this.current.commandMarker = this.term.registerMarker(0);
          this.updateSticky();
        }
        break;
      case "D": {
        if (this.current) {
          this.current.exitCode = arg === "" ? 0 : Number(arg);
          this.finalize(this.current);
          this.current = null;
        }
        break;
      }
      case "P": {
        const m = arg.match(/Cwd=(.*)/);
        if (m) this.set({ cwd: m[1] });
        break;
      }
    }
    return true;
  }

  private finalize(entry: CommandEntry) {
    if (entry.command && entry.promptMarker) {
      this.decorate(entry);
      this.entries.push(entry);
      if (this.entries.length > MAX_ENTRIES) {
        const old = this.entries.shift();
        old?.decoration?.dispose();
        old?.promptMarker?.dispose();
        old?.commandMarker?.dispose();
      }
    }
    const history = this.entries
      .map((e) => e.command)
      .filter(Boolean)
      .filter((c, i, a) => a.lastIndexOf(c) === i);
    const output = this.readOutput(entry);
    this.set({
      history,
      quickFixes:
        entry.exitCode && entry.exitCode !== 0
          ? detectQuickFixes(output, entry.command)
          : [],
    });
    this.updateSticky();
  }

  private decorate(entry: CommandEntry) {
    const marker = entry.promptMarker;
    if (!marker) return;
    const decoration = this.term.registerDecoration({ marker, x: 0, width: 1 });
    if (!decoration) return;
    entry.decoration = decoration;
    const failed = entry.exitCode !== 0;
    decoration.onRender((el) => {
      el.style.width = "3px";
      el.style.marginLeft = "1px";
      el.style.height = "100%";
      el.style.borderRadius = "1px";
      el.style.backgroundColor = failed ? "#f14c4c" : "#23d18b";
    });
  }

  private readOutput(entry: CommandEntry): string {
    const buf = this.term.buffer.active;
    const start = entry.commandMarker?.line;
    if (start == null) return "";
    const end = buf.baseY + buf.cursorY;
    const lines: string[] = [];
    for (let y = start + 1; y <= end && lines.length < 400; y++) {
      const line = buf.getLine(y);
      if (line) lines.push(line.translateToString(true));
    }
    return lines.join("\n");
  }

  private updateSticky() {
    const buf = this.term.buffer.active;
    const top = buf.viewportY;
    let sticky: IntegrationState["sticky"] = null;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      const line = e.commandMarker?.line;
      if (line != null && line >= 0 && line <= top && e.command) {
        const next = this.entries[i + 1]?.commandMarker?.line ?? Infinity;
        if (top < next) sticky = { command: e.command, failed: e.exitCode !== 0 };
        break;
      }
    }
    if (this.current?.commandMarker && this.current.command) {
      const line = this.current.commandMarker.line;
      if (line <= top) sticky = { command: this.current.command, failed: false };
    }
    if (
      sticky?.command !== this.state.sticky?.command ||
      sticky?.failed !== this.state.sticky?.failed
    ) {
      this.set({ sticky });
    }
  }

  markerLines(): number[] {
    return this.entries
      .map((e) => e.promptMarker?.line)
      .filter((l): l is number => l != null && l >= 0);
  }

  scrollToCommand(direction: 1 | -1) {
    const lines = this.markerLines();
    if (!lines.length) return;
    const top = this.term.buffer.active.viewportY;
    let target: number | undefined;
    if (direction < 0) {
      target = [...lines].reverse().find((l) => l < top);
    } else {
      target = lines.find((l) => l > top);
    }
    if (target != null) this.term.scrollToLine(target);
  }

  dispose() {
    for (const e of this.entries) {
      e.decoration?.dispose();
      e.promptMarker?.dispose();
      e.commandMarker?.dispose();
    }
    this.entries = [];
    this.listeners.clear();
  }
}
