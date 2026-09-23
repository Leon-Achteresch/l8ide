import { Channel, invoke } from "@tauri-apps/api/core";
import { disposeTaskProblems, feedTaskProblems } from "@/lib/task-problems";
import { openUrl } from "@tauri-apps/plugin-opener";
import { exists } from "@tauri-apps/plugin-fs";
import { FitAddon } from "@xterm/addon-fit";
import { ImageAddon } from "@xterm/addon-image";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { ideSurfaceColors } from "@/lib/ide-theme";
import { openFileAt } from "@/lib/monaco-navigation";
import { ShellIntegration } from "@/lib/terminal-shell-integration";
import { loadDetectedProfiles, resolveProfile } from "@/lib/terminal-profiles";
import { type Profile, useTerminalStore } from "@/lib/terminal-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { wslPath, wslWindowsPath } from "@/lib/wsl-path";

type PtyEvent =
  | { type: "data"; data: string; bytes: number }
  | { type: "exit" };

type TermSession = {
  container: HTMLDivElement;
  term: Terminal;
  fit: FitAddon;
  search: SearchAddon;
  integration: ShellIntegration;
  ptyId: number | null;
  opened: boolean;
  polling: boolean;
  pendingInput: string;
  wslDistribution: string | null;
};

const SHELL_NAMES = new Set(["zsh", "bash", "fish", "sh", "nu", "pwsh", "powershell.exe", "cmd.exe"]);
const FILE_RE = /(~?[\w.@+-]*(?:\/[\w.@+-]+)+\.\w+)(?::(\d+))?(?::(\d+))?/g;

const ANSI_DARK: Omit<ITheme, "background" | "foreground" | "cursor" | "selectionBackground"> = {
  black: "#1a1a1c",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#d0d0d2",
  brightBlack: "#6e6e73",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#ececee",
};

const ANSI_LIGHT: Omit<ITheme, "background" | "foreground" | "cursor" | "selectionBackground"> = {
  black: "#3a3a3c",
  red: "#cd3131",
  green: "#107c10",
  yellow: "#949800",
  blue: "#0451a5",
  magenta: "#bc05bc",
  cyan: "#0598bc",
  white: "#6e6e73",
  brightBlack: "#a0a0a4",
  brightRed: "#cd3131",
  brightGreen: "#14ce14",
  brightYellow: "#b5ba00",
  brightBlue: "#0451a5",
  brightMagenta: "#bc05bc",
  brightCyan: "#0598bc",
  brightWhite: "#a0a0a4",
};

function currentTheme(): ITheme {
  const { background, foreground, selection } = ideSurfaceColors();
  const ansi = document.documentElement.classList.contains("dark") ? ANSI_DARK : ANSI_LIGHT;
  return {
    ...ansi,
    background,
    foreground,
    cursor: foreground,
    selectionBackground: selection,
  };
}

const sessions = new Map<number, TermSession>();
const sessionListeners = new Set<() => void>();

export function subscribeSessions(cb: () => void) {
  sessionListeners.add(cb);
  return () => {
    sessionListeners.delete(cb);
  };
}

function notifySessions() {
  for (const cb of sessionListeners) cb();
}

new MutationObserver(() => {
  const theme = currentTheme();
  for (const s of sessions.values()) s.term.options.theme = theme;
}).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

export function getSession(id: number) {
  return sessions.get(id);
}

function resolvePath(raw: string, cwd: string | null, wslDistribution: string | null): string | null {
  let p = raw;
  if (wslDistribution && p.startsWith("/")) return wslWindowsPath(wslDistribution, p);
  if (p.startsWith("/")) return p;
  if (p.startsWith("~")) return null;
  const base = cwd ?? useWorkspaceStore.getState().rootPath;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${p.replace(/^\.\//, "")}`;
}

function sessionCwd(session: TermSession): string | null {
  const cwd = session.integration.getState().cwd;
  return cwd && session.wslDistribution && cwd.startsWith("/")
    ? wslWindowsPath(session.wslDistribution, cwd)
    : cwd;
}

function registerFileLinks(session: TermSession) {
  session.term.registerLinkProvider({
    provideLinks(y, callback) {
      const buf = session.term.buffer.active;
      const line = buf.getLine(y - 1);
      if (!line) return callback(undefined);
      const text = line.translateToString(true);
      const cwd = sessionCwd(session);
      const candidates: {
        start: number;
        end: number;
        path: string;
        line: number;
        column: number;
      }[] = [];
      for (const m of text.matchAll(FILE_RE)) {
        const abs = resolvePath(m[1], cwd, session.wslDistribution);
        if (!abs) continue;
        candidates.push({
          start: m.index,
          end: m.index + m[0].length,
          path: abs,
          line: m[2] ? Number(m[2]) : 1,
          column: m[3] ? Number(m[3]) : 1,
        });
      }
      if (candidates.length === 0) return callback(undefined);
      void Promise.all(
        candidates.map((c) => exists(c.path).then((ok) => (ok ? c : null)).catch(() => null)),
      ).then((resolved) => {
        const links = resolved
          .filter((c): c is NonNullable<typeof c> => c != null)
          .map((c) => ({
            range: {
              start: { x: c.start + 1, y },
              end: { x: c.end + 1, y },
            },
            text: c.path,
            activate: () => openFileAt(c.path, { line: c.line, column: c.column }),
          }));
        callback(links.length ? links : undefined);
      });
    },
  });
}

function ensureSession(id: number): TermSession {
  const existing = sessions.get(id);
  if (existing) return existing;

  const container = document.createElement("div");
  container.className = "size-full";

  const term = new Terminal({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    lineHeight: 1.2,
    cursorBlink: true,
    scrollback: 10_000,
    allowProposedApi: true,
    theme: currentTheme(),
  });
  const fit = new FitAddon();
  const search = new SearchAddon();
  const integration = new ShellIntegration(term);
  term.loadAddon(fit);
  term.loadAddon(search);

  const session: TermSession = {
    container,
    term,
    fit,
    search,
    integration,
    ptyId: null,
    opened: false,
    polling: false,
    pendingInput: "",
    wslDistribution: null,
  };
  sessions.set(id, session);
  notifySessions();

  term.onData((data) => {
    if (session.ptyId === null) {
      session.pendingInput += data;
      return;
    }
    void invoke("pty_write", { id: session.ptyId, data });
    if (data.includes("\r")) void pollTitle(id, session);
  });
  term.onResize(({ cols, rows }) => {
    if (session.ptyId !== null) void invoke("pty_resize", { id: session.ptyId, cols, rows });
  });

  return session;
}

export function attachSession(
  id: number,
  host: HTMLElement,
  opts: { profileId: string; cwd: string | null; ptyId: number | null },
) {
  const session = ensureSession(id);
  session.wslDistribution = wslPath(opts.cwd ?? "")?.distribution ?? null;
  host.appendChild(session.container);

  if (!session.opened) {
    session.opened = true;
    session.term.open(session.container);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      session.term.loadAddon(webgl);
    } catch {
      /* DOM renderer fallback */
    }
    session.term.loadAddon(new Unicode11Addon());
    session.term.unicode.activeVersion = "11";
    session.term.loadAddon(new WebLinksAddon((_, uri) => void openUrl(uri)));
    session.term.loadAddon(new ImageAddon());
    registerFileLinks(session);
    session.integration.subscribe(() => {
      const cwd = sessionCwd(session);
      if (cwd) useTerminalStore.getState().setCwd(id, cwd);
    });
    void resolveAndStart(id, session, opts);
  }

  session.fit.fit();
  session.term.focus();
}

async function resolveAndStart(
  id: number,
  session: TermSession,
  opts: { profileId: string; cwd: string | null; ptyId: number | null },
) {
  let profile: Profile | null = null;
  if (opts.profileId && opts.profileId !== "default") {
    const detected = await loadDetectedProfiles();
    const custom = useTerminalStore.getState().customProfiles;
    profile = resolveProfile(opts.profileId, detected, custom);
    if (profile?.id.startsWith("wsl:")) session.wslDistribution = profile.id.slice(4);
  }
  const cwd = profile?.id.startsWith("wsl") && !wslPath(opts.cwd ?? "") ? null : opts.cwd;
  await start(id, session, profile, cwd, opts.ptyId);
}

function flushInput(session: TermSession) {
  if (session.ptyId !== null && session.pendingInput) {
    void invoke("pty_write", { id: session.ptyId, data: session.pendingInput });
    session.pendingInput = "";
  }
}

async function start(
  id: number,
  session: TermSession,
  profile: Profile | null,
  cwd: string | null,
  reconnectId: number | null,
) {
  const { term } = session;
  if (cwd) useTerminalStore.getState().setCwd(id, cwd);
  const channel = new Channel<PtyEvent>();
  channel.onmessage = (event) => {
    if (event.type === "data") {
      feedTaskProblems(id, event.data, sessionCwd(session));
      term.write(event.data, () => {
        if (session.ptyId !== null) void invoke("pty_ack", { id: session.ptyId, bytes: event.bytes });
      });
    } else {
      useTerminalStore.getState().closePane(id);
      disposeSession(id);
    }
  };

  if (reconnectId !== null) {
    const ok = await invoke<boolean>("pty_reconnect", { id: reconnectId, onEvent: channel }).catch(
      () => false,
    );
    if (ok) {
      session.ptyId = reconnectId;
      flushInput(session);
      session.fit.fit();
      void invoke("pty_resize", { id: reconnectId, cols: term.cols, rows: term.rows });
      void pollTitle(id, session);
      return;
    }
  }

  try {
    session.ptyId = await invoke<number>("pty_spawn", {
      shell: profile?.path ?? null,
      args: profile?.args ?? null,
      env: profile?.env ?? null,
      cwd,
      integration: true,
      cols: term.cols,
      rows: term.rows,
      onEvent: channel,
    });
  } catch (error) {
    term.write(`\r\nFailed to spawn shell: ${String(error)}\r\n`);
    return;
  }
  useTerminalStore.getState().setPtyId(id, session.ptyId);
  flushInput(session);
  session.fit.fit();
  void invoke("pty_resize", { id: session.ptyId, cols: term.cols, rows: term.rows });
  void pollTitle(id, session);
}

export function runCommand(id: number, text: string) {
  const session = sessions.get(id);
  if (!session || session.ptyId === null) return;
  void invoke("pty_write", { id: session.ptyId, data: `${text}\r` });
  session.term.focus();
}

function insideRoot(cwd: string | null, root: string | null) {
  if (!root) return true;
  if (!cwd) return false;
  return cwd === root || cwd.startsWith(`${root}/`) || cwd.startsWith(`${root}\\`);
}

export async function runInTerminal(text: string, options: { newGroup?: boolean } = {}) {
  const store = useTerminalStore.getState();
  const root = useWorkspaceStore.getState().rootPath;
  store.setOpen(true);

  const active = store.activePane;
  const activeCwd = active != null ? (store.panes[active]?.cwd ?? null) : null;
  if (options.newGroup || active == null || (root && wslPath(root)) || !insideRoot(activeCwd, root)) store.addGroup();

  const paneId = useTerminalStore.getState().activePane;
  if (paneId == null) return;
  for (let i = 0; i < 100; i++) {
    if (sessions.get(paneId)?.ptyId != null) {
      runCommand(paneId, text);
      return;
    }
    await sleep(50);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollTitle(id: number, session: TermSession) {
  if (session.polling) return;
  session.polling = true;
  let delay = 250;
  try {
    while (session.ptyId !== null) {
      await sleep(delay);
      if (session.ptyId === null) break;
      const name = await invoke<string | null>("pty_process", { id: session.ptyId }).catch(
        () => null,
      );
      if (name) useTerminalStore.getState().setTitle(id, name);
      if (!session.integration.getState().cwd) {
        const cwd = await invoke<string | null>("pty_cwd", { id: session.ptyId }).catch(() => null);
        if (cwd) useTerminalStore.getState().setCwd(id, cwd);
      }
      if (name && SHELL_NAMES.has(name)) break;
      delay = 1000;
    }
  } finally {
    session.polling = false;
  }
}

export function disposeSession(id: number) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  disposeTaskProblems(id);
  notifySessions();
  if (session.ptyId !== null) void invoke("pty_kill", { id: session.ptyId });
  session.integration.dispose();
  session.term.dispose();
  session.container.remove();
}
