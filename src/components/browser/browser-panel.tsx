import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  RotateCw,
  X,
} from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  browserEval,
  closeBrowser,
  openBrowser,
  setBrowserBounds,
  showBrowser,
  navigateBrowser,
  type Rect,
} from "@/lib/browser";
import { useBrowserStore } from "@/lib/browser-store";
import { cn } from "@/lib/utils";

const OVERLAY_SELECTOR =
  '[data-slot="dialog-overlay"],[role="dialog"],[role="menu"],[role="listbox"],[data-overlay]';

const ICON_BUTTON =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function BrowserPanel() {
  const open = useBrowserStore((s) => s.open);
  useEffect(() => {
    if (!useBrowserStore.getState().open) void closeBrowser();
  }, []);
  if (!open) return null;
  return <BrowserPanelInner />;
}

function BrowserPanelInner() {
  const width = useBrowserStore((s) => s.width);
  const url = useBrowserStore((s) => s.url);
  const loading = useBrowserStore((s) => s.loading);
  const setWidth = useBrowserStore((s) => s.setWidth);
  const setOpen = useBrowserStore((s) => s.setOpen);

  const hostRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const [draft, setDraft] = useState(url);

  useEffect(() => {
    if (!editingRef.current) setDraft(url);
  }, [url]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    const rect = (): Rect => {
      const r = host.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void setBrowserBounds(rect()));
    };

    const start = () => {
      if (cancelled) return;
      const r = rect();
      if (r.width < 2 || r.height < 2) {
        requestAnimationFrame(start);
        return;
      }
      void openBrowser(r).then(() => {
        if (cancelled) return;
        const n = rect();
        void setBrowserBounds({ ...n, width: Math.max(1, n.width - 1) });
        requestAnimationFrame(() => !cancelled && void setBrowserBounds(rect()));
      });
    };
    start();

    const observed = host.parentElement ?? host;
    const ro = new ResizeObserver(sync);
    ro.observe(observed);
    window.addEventListener("resize", sync);

    const isObscured = () =>
      Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).some((el) => {
        if (el.closest(".monaco-editor")) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    let visible = true;
    const applyVisibility = () => {
      const next = !isObscured();
      if (next === visible) return;
      visible = next;
      void showBrowser(next);
      if (next) sync();
    };
    const mo = new MutationObserver(() =>
      requestAnimationFrame(applyVisibility),
    );
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "data-overlay"],
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", sync);
      void showBrowser(false);
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    editingRef.current = false;
    void navigateBrowser(draft);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    let x = startX;
    let frame = 0;
    const onMove = (ev: PointerEvent) => {
      x = ev.clientX;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          setWidth(startWidth + startX - x);
        });
      }
    };
    const onUp = () => {
      if (frame) cancelAnimationFrame(frame);
      setWidth(startWidth + startX - x);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      style={{ width }}
      className="relative flex shrink-0 flex-col border-l bg-background"
    >
      <div
        onPointerDown={startResize}
        className="absolute inset-y-0 -left-1.5 z-30 w-2 cursor-col-resize"
      />
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b px-1.5">
        <button
          type="button"
          onClick={() => void browserEval("history.back()")}
          title="Zurück"
          className={ICON_BUTTON}
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void browserEval("history.forward()")}
          title="Vor"
          className={ICON_BUTTON}
        >
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void browserEval("location.reload()")}
          title="Neu laden"
          className={ICON_BUTTON}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RotateCw className="size-4" />
          )}
        </button>
        <form onSubmit={submit} className="mx-0.5 min-w-0 flex-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => {
              editingRef.current = true;
              e.currentTarget.select();
            }}
            onBlur={() => {
              editingRef.current = false;
              setDraft(url);
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="URL oder Suche…"
            className={cn(
              "h-7 w-full rounded-md bg-muted/50 px-2.5 text-xs text-foreground",
              "outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted",
            )}
          />
        </form>
        <button
          type="button"
          onClick={() => url && void openUrl(url)}
          title="Extern öffnen"
          className={ICON_BUTTON}
        >
          <ExternalLink className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Panel schließen"
          className={ICON_BUTTON}
        >
          <X className="size-4" />
        </button>
      </div>
      <div ref={hostRef} className="min-h-0 flex-1" />
    </div>
  );
}
