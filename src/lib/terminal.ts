import { Channel, invoke } from "@tauri-apps/api/core";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal, type ITheme } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { ideSurfaceColors } from "@/lib/ide-theme";
import { useTerminalStore } from "@/lib/terminal-store";

type PtyEvent =
  | { type: "data"; data: string; bytes: number }
  | { type: "exit" };

type TermSession = {
  container: HTMLDivElement;
  term: Terminal;
  fit: FitAddon;
  ptyId: number | null;
  polling: boolean;
};

const SHELL_NAMES = new Set(["zsh", "bash", "fish", "sh", "nu", "pwsh", "powershell.exe"]);

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
  const ansi = document.documentElement.classList.contains("dark")
    ? ANSI_DARK
    : ANSI_LIGHT;
  return {
    ...ansi,
    background,
    foreground,
    cursor: foreground,
    selectionBackground: selection,
  };
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

  const session: TermSession = { container, term, fit, ptyId: null, polling: false };
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
    if (session.ptyId === null) return;
    void invoke("pty_write", { id: session.ptyId, data });
    if (data.includes("\r")) void pollTitle(id, session);
  });
  term.onResize(({ cols, rows }) => {
    if (session.ptyId !== null) void invoke("pty_resize", { id: session.ptyId, cols, rows });
  });
  session.fit.fit();
  void invoke("pty_resize", { id: session.ptyId, cols: term.cols, rows: term.rows });
  void pollTitle(id, session);
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
      const name = await invoke<string | null>("pty_process", {
        id: session.ptyId,
      }).catch(() => null);
      if (!name) break;
      useTerminalStore.getState().setTitle(id, name);
      if (SHELL_NAMES.has(name)) break;
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
  if (session.ptyId !== null) void invoke("pty_kill", { id: session.ptyId });
  session.term.dispose();
  session.container.remove();
}
