const LOG_KEY = "dnd-debug";

function enabled() {
  return import.meta.env.DEV || localStorage.getItem(LOG_KEY) === "1";
}

const t0 = performance.now();

export function dlog(...args: unknown[]) {
  if (!enabled()) return;
  console.log(`[dnd +${Math.round(performance.now() - t0)}ms]`, ...args);
}

const DRAG_EVENTS = [
  "dragstart",
  "dragenter",
  "dragover",
  "dragleave",
  "drop",
  "dragend",
] as const;

export function installDndDiagnostics() {
  if (!enabled()) return;
  const w = window as Window & { __dndDiagnostics?: boolean };
  if (w.__dndDiagnostics) return;
  w.__dndDiagnostics = true;
  let lastOverLog = 0;
  for (const type of DRAG_EVENTS) {
    window.addEventListener(type, (e) => {
      if (type === "dragover") {
        const now = performance.now();
        if (now - lastOverLog < 500) return;
        lastOverLog = now;
      }
      const de = e as DragEvent;
      const el = e.target as HTMLElement | null;
      dlog(`window:${type}`, {
        target:
          el?.closest?.("[data-path]")?.getAttribute("data-path") ??
          el?.tagName,
        types: de.dataTransfer ? [...de.dataTransfer.types] : null,
        defaultPrevented: e.defaultPrevented,
      });
    });
  }
  dlog("diagnostics installed — window:* logs zeigen native Drag-Events (nur externe Drops)");
}
