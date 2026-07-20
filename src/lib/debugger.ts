import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { openFileAt } from "@/lib/monaco-navigation";

export type DebugState = "disconnected" | "connecting" | "running" | "paused";

export type StackFrame = {
  functionName: string;
  url: string;
  line: number;
  column: number;
};

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

type DebuggerStore = {
  state: DebugState;
  frames: StackFrame[];
  port: number;
  connect: (port?: number) => Promise<void>;
  disconnect: () => void;
  resume: () => void;
  pause: () => void;
  stepOver: () => void;
  stepInto: () => void;
  stepOut: () => void;
};

let ws: WebSocket | null = null;
let nextId = 1;

function send(method: string, params?: Record<string, unknown>) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ id: nextId++, method, ...(params ? { params } : {}) }));
  }
}

function toFrames(callFrames: unknown): StackFrame[] {
  if (!Array.isArray(callFrames)) return [];
  return callFrames.slice(0, 12).map((f) => {
    const frame = f as {
      functionName?: string;
      url?: string;
      location?: { lineNumber?: number; columnNumber?: number };
    };
    return {
      functionName: frame.functionName || "(anonym)",
      url: frame.url ?? "",
      line: (frame.location?.lineNumber ?? 0) + 1,
      column: (frame.location?.columnNumber ?? 0) + 1,
    };
  });
}

export const useDebugger = create<DebuggerStore>()((set, get) => ({
  state: "disconnected",
  frames: [],
  port: 9229,

  connect: async (port = 9229) => {
    if (get().state !== "disconnected") get().disconnect();
    set({ state: "connecting", port });
    let wsUrl: string | undefined;
    try {
      const res = await invoke<ShellResult>("run_shell", {
        cwd: "/",
        command: `curl -s http://127.0.0.1:${port}/json/list`,
        timeoutMs: 5000,
      });
      const targets = JSON.parse(res.stdout) as {
        webSocketDebuggerUrl?: string;
        type?: string;
      }[];
      wsUrl = targets.find((t) => t.webSocketDebuggerUrl)?.webSocketDebuggerUrl;
    } catch {
      wsUrl = undefined;
    }
    if (!wsUrl) {
      set({ state: "disconnected" });
      toast.error(
        `Kein Inspector auf Port ${port}. Prozess mit \`node --inspect\` starten.`,
      );
      return;
    }
    const socket = new WebSocket(wsUrl);
    ws = socket;
    socket.onopen = () => {
      set({ state: "running" });
      send("Debugger.enable");
      send("Runtime.enable");
      send("Runtime.runIfWaitingForDebugger");
      toast.success(`Debugger verbunden (Port ${port})`);
    };
    socket.onmessage = (event) => {
      let msg: { method?: string; params?: { callFrames?: unknown } };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.method === "Debugger.paused") {
        const frames = toFrames(msg.params?.callFrames);
        set({ state: "paused", frames });
        const top = frames.find((f) => f.url.startsWith("file://"));
        if (top) {
          openFileAt(decodeURI(top.url.slice("file://".length)), {
            line: top.line,
            column: top.column,
          });
        }
      } else if (msg.method === "Debugger.resumed") {
        set({ state: "running", frames: [] });
      }
    };
    socket.onclose = () => {
      if (ws === socket) {
        ws = null;
        set({ state: "disconnected", frames: [] });
      }
    };
    socket.onerror = () => socket.close();
  },

  disconnect: () => {
    ws?.close();
    ws = null;
    set({ state: "disconnected", frames: [] });
  },

  resume: () => send("Debugger.resume"),
  pause: () => send("Debugger.pause"),
  stepOver: () => send("Debugger.stepOver"),
  stepInto: () => send("Debugger.stepInto"),
  stepOut: () => send("Debugger.stepOut"),
}));

export function jumpToFrame(frame: StackFrame) {
  if (!frame.url.startsWith("file://")) return;
  openFileAt(decodeURI(frame.url.slice("file://".length)), {
    line: frame.line,
    column: frame.column,
  });
}
