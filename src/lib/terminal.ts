import { Channel, invoke } from "@tauri-apps/api/core";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useTerminalStore } from "@/lib/terminal-store";

type PtyEvent =
  | { type: "data"; data: string; bytes: number }
  | { type: "exit" };

type TermSession = {
  container: HTMLDivElement;
  term: Terminal;
  fit: FitAddon;
  ptyId: number | null;
};

const DARK_THEME: ITheme = {
  background: "#181818",
  foreground: "#cccccc",
  cursor: "#cccccc",
  selectionBackground: "#264f78",
  black: "#000000",
  red: "#cd3131",
  green: "#0dbc79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#e5e5e5",
};

const LIGHT_THEME: ITheme = {
  background: "#ffffff",
  foreground: "#3b3b3b",
  cursor: "#3b3b3b",
  selectionBackground: "#add6ff",
  black: "#000000",
  red: "#cd3131",
  green: "#107c10",
  yellow: "#949800",
  blue: "#0451a5",
  magenta: "#bc05bc",
  cyan: "#0598bc",
  white: "#555555",
  brightBlack: "#666666",
  brightRed: "#cd3131",
  brightGreen: "#14ce14",
  brightYellow: "#b5ba00",
  brightBlue: "#0451a5",
  brightMagenta: "#bc05bc",
  brightCyan: "#0598bc",
  brightWhite: "#a5a5a5",
};

function currentTheme(): ITheme {
  return document.documentElement.classList.contains("dark")
    ? DARK_THEME
    : LIGHT_THEME;
}

const sessions = new Map<number, TermSession>();

new MutationObserver(() => {
  const theme = currentTheme();
  for (const s of sessions.values()) s.term.options.theme = theme;
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});

export function getSession(id: number) {
  return sessions.get(id);
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
  term.loadAddon(fit);

  const session: TermSession = { container, term, fit, ptyId: null };
  sessions.set(id, session);
  return session;
}

export function attachSession(id: number, host: HTMLElement, cwd: string | null) {
  const session = ensureSession(id);
  host.appendChild(session.container);

  if (!session.container.querySelector(".xterm")) {
    session.term.open(session.container);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      session.term.loadAddon(webgl);
    } catch {
      /* DOM renderer fallback */
    }
    void spawn(id, session, cwd);
  }

  session.fit.fit();
  session.term.focus();
}

async function spawn(id: number, session: TermSession, cwd: string | null) {
  const { term } = session;
  const channel = new Channel<PtyEvent>();
  channel.onmessage = (event) => {
    if (event.type === "data") {
      term.write(event.data, () => {
        if (session.ptyId !== null) {
          void invoke("pty_ack", { id: session.ptyId, bytes: event.bytes });
        }
      });
    } else {
      useTerminalStore.getState().remove(id);
      disposeSession(id);
    }
  };

  try {
    session.ptyId = await invoke<number>("pty_spawn", {
      cwd,
      cols: term.cols,
      rows: term.rows,
      onEvent: channel,
    });
  } catch (error) {
    term.write(`\r\nFailed to spawn shell: ${String(error)}\r\n`);
    return;
  }

  term.onData((data) => {
    if (session.ptyId !== null) void invoke("pty_write", { id: session.ptyId, data });
  });
  term.onResize(({ cols, rows }) => {
    if (session.ptyId !== null) void invoke("pty_resize", { id: session.ptyId, cols, rows });
  });
  session.fit.fit();
  void invoke("pty_resize", { id: session.ptyId, cols: term.cols, rows: term.rows });
}

export function disposeSession(id: number) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  if (session.ptyId !== null) void invoke("pty_kill", { id: session.ptyId });
  session.term.dispose();
  session.container.remove();
}
