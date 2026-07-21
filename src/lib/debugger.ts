import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { openFileAt } from "@/lib/monaco-navigation";

export type DebugState = "disconnected" | "connecting" | "running" | "paused";

export type StackFrame = {
  functionName: string;
  url: string;
  line: number;
  column: number;
};

export type VarNode = {
  name: string;
  value: string;
  objectId?: string;
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
  variables: VarNode[];
  topCallFrameId: string | null;
  port: number;
  breakpoints: Record<string, number[]>;
  bpConditions: Record<string, string>;
  bpLogpoints: Record<string, string>;
  conditionTarget: { path: string; line: number } | null;
  setConditionTarget: (t: { path: string; line: number } | null) => void;
  setBreakpointCondition: (path: string, line: number, condition: string) => void;
  setBreakpointLogpoint: (path: string, line: number, message: string) => void;
  watches: string[];
  watchValues: Record<string, string>;
  pauseOnExceptions: "none" | "uncaught" | "all";
  addWatch: (expr: string) => void;
  removeWatch: (expr: string) => void;
  cyclePauseOnExceptions: () => void;
  connect: (port?: number) => Promise<void>;
  disconnect: () => void;
  resume: () => void;
  pause: () => void;
  stepOver: () => void;
  stepInto: () => void;
  stepOut: () => void;
  toggleBreakpoint: (path: string, line: number) => void;
};

let ws: WebSocket | null = null;
let nextId = 1;
const pending = new Map<number, (result: unknown) => void>();
const bpIds = new Map<string, string>();

function send(
  method: string,
  params?: Record<string, unknown>,
  onResult?: (result: unknown) => void,
) {
  if (ws?.readyState === WebSocket.OPEN) {
    const id = nextId++;
    if (onResult) pending.set(id, onResult);
    ws.send(JSON.stringify({ id, method, ...(params ? { params } : {}) }));
  }
}

function bpKey(path: string, line: number) {
  return `${path}:${line}`;
}

function sendAndWait(
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve) => {
    if (ws?.readyState !== WebSocket.OPEN) return resolve(undefined);
    send(method, params, resolve);
  });
}

type RemoteObject = {
  type?: string;
  subtype?: string;
  value?: unknown;
  description?: string;
  objectId?: string;
};

function describeRemote(v: RemoteObject | undefined): string {
  if (!v) return "undefined";
  if (v.value !== undefined) {
    try {
      return JSON.stringify(v.value);
    } catch {
      return String(v.value);
    }
  }
  if (v.type === "undefined") return "undefined";
  if (v.subtype === "null") return "null";
  return v.description ?? v.type ?? "?";
}

export async function loadProperties(objectId: string): Promise<VarNode[]> {
  const result = (await sendAndWait("Runtime.getProperties", {
    objectId,
    ownProperties: true,
  })) as
    | { result?: { name: string; value?: RemoteObject }[] }
    | undefined;
  return (result?.result ?? [])
    .filter((p) => p.value)
    .slice(0, 40)
    .map((p) => ({
      name: p.name,
      value: describeRemote(p.value),
      objectId:
        p.value?.type === "object" && p.value.subtype !== "null"
          ? p.value.objectId
          : undefined,
    }));
}

export function logpointCondition(message: string): string {
  const tpl = message
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\{([^}]+)\}/g, "${$1}");
  return `(console.log(\`${tpl}\`), false)`;
}

function sendSetBreakpoint(path: string, line: number) {
  const { bpConditions, bpLogpoints } = useDebugger.getState();
  const log = bpLogpoints[bpKey(path, line)];
  const condition = log ? logpointCondition(log) : bpConditions[bpKey(path, line)];
  send(
    "Debugger.setBreakpointByUrl",
    {
      lineNumber: line - 1,
      url: `file://${encodeURI(path)}`,
      ...(condition ? { condition } : {}),
    },
    (result) => {
      const id = (result as { breakpointId?: string } | undefined)?.breakpointId;
      if (id) bpIds.set(bpKey(path, line), id);
    },
  );
}

function sendRemoveBreakpoint(path: string, line: number) {
  const id = bpIds.get(bpKey(path, line));
  if (id) {
    send("Debugger.removeBreakpoint", { breakpointId: id });
    bpIds.delete(bpKey(path, line));
  }
}

function syncAllBreakpoints() {
  const { breakpoints } = useDebugger.getState();
  for (const [path, lines] of Object.entries(breakpoints)) {
    for (const line of lines) sendSetBreakpoint(path, line);
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

export const useDebugger = create<DebuggerStore>()(
  persist(
    (set, get) => ({
  state: "disconnected",
  frames: [],
  variables: [],
  topCallFrameId: null,
  port: 9229,
  breakpoints: {},
  bpConditions: {},
  bpLogpoints: {},
  conditionTarget: null,
  setConditionTarget: (conditionTarget) => set({ conditionTarget }),

  setBreakpointCondition: (path, line, condition) => {
    const key = bpKey(path, line);
    set((s) => {
      const bpConditions = { ...s.bpConditions };
      const bpLogpoints = { ...s.bpLogpoints };
      delete bpLogpoints[key];
      if (condition.trim()) bpConditions[key] = condition.trim();
      else delete bpConditions[key];
      return { bpConditions, bpLogpoints };
    });
    const lines = get().breakpoints[path] ?? [];
    if (!lines.includes(line)) {
      get().toggleBreakpoint(path, line);
      return;
    }
    if (get().state === "running" || get().state === "paused") {
      sendRemoveBreakpoint(path, line);
      sendSetBreakpoint(path, line);
    }
  },
  watches: [],
  watchValues: {},
  pauseOnExceptions: "none",

  addWatch: (expr) => {
    const trimmed = expr.trim();
    if (!trimmed || get().watches.includes(trimmed)) return;
    set((s) => ({ watches: [...s.watches, trimmed] }));
    void refreshWatches();
  },

  removeWatch: (expr) =>
    set((s) => {
      const watchValues = { ...s.watchValues };
      delete watchValues[expr];
      return { watches: s.watches.filter((w) => w !== expr), watchValues };
    }),

  cyclePauseOnExceptions: () => {
    const order = ["none", "uncaught", "all"] as const;
    const next =
      order[(order.indexOf(get().pauseOnExceptions) + 1) % order.length];
    set({ pauseOnExceptions: next });
    if (get().state === "running" || get().state === "paused") {
      send("Debugger.setPauseOnExceptions", { state: next });
    }
  },

  setBreakpointLogpoint: (path, line, message) => {
    const key = bpKey(path, line);
    set((s) => {
      const bpConditions = { ...s.bpConditions };
      const bpLogpoints = { ...s.bpLogpoints };
      delete bpConditions[key];
      if (message.trim()) bpLogpoints[key] = message.trim();
      else delete bpLogpoints[key];
      return { bpConditions, bpLogpoints };
    });
    const lines = get().breakpoints[path] ?? [];
    if (!lines.includes(line)) {
      get().toggleBreakpoint(path, line);
      return;
    }
    if (get().state === "running" || get().state === "paused") {
      sendRemoveBreakpoint(path, line);
      sendSetBreakpoint(path, line);
    }
  },

  toggleBreakpoint: (path, line) => {
    const current = get().breakpoints[path] ?? [];
    const has = current.includes(line);
    const lines = has
      ? current.filter((l) => l !== line)
      : [...current, line].sort((a, b) => a - b);
    set((s) => {
      const breakpoints = { ...s.breakpoints };
      if (lines.length === 0) delete breakpoints[path];
      else breakpoints[path] = lines;
      const bpConditions = { ...s.bpConditions };
      const bpLogpoints = { ...s.bpLogpoints };
      if (has) {
        delete bpConditions[bpKey(path, line)];
        delete bpLogpoints[bpKey(path, line)];
      }
      return { breakpoints, bpConditions, bpLogpoints };
    });
    if (get().state === "running" || get().state === "paused") {
      if (has) sendRemoveBreakpoint(path, line);
      else sendSetBreakpoint(path, line);
    }
  },

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
      syncAllBreakpoints();
      const { pauseOnExceptions } = get();
      if (pauseOnExceptions !== "none") {
        send("Debugger.setPauseOnExceptions", { state: pauseOnExceptions });
      }
      send("Runtime.runIfWaitingForDebugger");
      toast.success(`Debugger verbunden (Port ${port})`);
    };
    socket.onmessage = (event) => {
      let msg: {
        id?: number;
        result?: unknown;
        method?: string;
        params?: { callFrames?: unknown };
      };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.id !== undefined) {
        pending.get(msg.id)?.(msg.result);
        pending.delete(msg.id);
        return;
      }
      if (msg.method === "Debugger.paused") {
        const raw = msg.params?.callFrames;
        const frames = toFrames(raw);
        const topRaw = Array.isArray(raw)
          ? (raw[0] as {
              callFrameId?: string;
              scopeChain?: { type?: string; object?: { objectId?: string } }[];
            })
          : undefined;
        set({
          state: "paused",
          frames,
          variables: [],
          topCallFrameId: topRaw?.callFrameId ?? null,
        });
        const scopes = (topRaw?.scopeChain ?? []).filter(
          (s) =>
            (s.type === "local" || s.type === "block" || s.type === "closure") &&
            s.object?.objectId,
        );
        if (scopes.length > 0) {
          void Promise.all(
            scopes.map((s) => loadProperties(s.object!.objectId!)),
          ).then((lists) => {
            const seen = new Set<string>();
            const variables = lists
              .flat()
              .filter((v) => (seen.has(v.name) ? false : (seen.add(v.name), true)));
            if (useDebugger.getState().state === "paused") set({ variables });
          });
        }
        void refreshWatches();
        const top = frames.find((f) => f.url.startsWith("file://"));
        if (top) {
          openFileAt(decodeURI(top.url.slice("file://".length)), {
            line: top.line,
            column: top.column,
          });
        }
      } else if (msg.method === "Debugger.resumed") {
        set({ state: "running", frames: [], variables: [], topCallFrameId: null, watchValues: {} });
      }
    };
    socket.onclose = () => {
      if (ws === socket) {
        ws = null;
        pending.clear();
        bpIds.clear();
        set({ state: "disconnected", frames: [], variables: [], topCallFrameId: null });
      }
    };
    socket.onerror = () => socket.close();
  },

  disconnect: () => {
    ws?.close();
    ws = null;
    pending.clear();
    bpIds.clear();
    set({ state: "disconnected", frames: [], variables: [], topCallFrameId: null });
  },

  resume: () => send("Debugger.resume"),
  pause: () => send("Debugger.pause"),
  stepOver: () => send("Debugger.stepOver"),
  stepInto: () => send("Debugger.stepInto"),
  stepOut: () => send("Debugger.stepOut"),
    }),
    {
      name: "debugger",
      partialize: (s) => ({
        breakpoints: s.breakpoints,
        bpConditions: s.bpConditions,
        bpLogpoints: s.bpLogpoints,
        watches: s.watches,
        pauseOnExceptions: s.pauseOnExceptions,
      }),
    },
  ),
);

async function refreshWatches() {
  const { watches, state } = useDebugger.getState();
  if (state !== "paused" || watches.length === 0) return;
  const entries = await Promise.all(
    watches.map(async (expr) => {
      const value = await evaluateOnTopFrame(expr);
      return [expr, value ?? "⟨nicht auswertbar⟩"] as const;
    }),
  );
  if (useDebugger.getState().state === "paused") {
    useDebugger.setState({ watchValues: Object.fromEntries(entries) });
  }
}

export async function evaluateOnTopFrame(
  expression: string,
): Promise<string | null> {
  const { state, topCallFrameId } = useDebugger.getState();
  if (state !== "paused" || !topCallFrameId) return null;
  const result = (await sendAndWait("Debugger.evaluateOnCallFrame", {
    callFrameId: topCallFrameId,
    expression,
    throwOnSideEffect: true,
    timeout: 500,
  })) as
    | { result?: RemoteObject; exceptionDetails?: unknown }
    | undefined;
  if (!result || result.exceptionDetails) return null;
  return describeRemote(result.result);
}

export function jumpToFrame(frame: StackFrame) {
  if (!frame.url.startsWith("file://")) return;
  openFileAt(decodeURI(frame.url.slice("file://".length)), {
    line: frame.line,
    column: frame.column,
  });
}
