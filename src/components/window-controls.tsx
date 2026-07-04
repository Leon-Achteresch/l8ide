import { getCurrentWindow } from "@tauri-apps/api/window";
import { type CSSProperties, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const IS_TAURI =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path d="M0 5h10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <rect
        x="0.5"
        y="2.5"
        width="7"
        height="7"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M2.5 1h5A2.5 2.5 0 0 1 10 3.5v4"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path
        d="M0.5 0.5l9 9m0-9l-9 9"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!IS_TAURI) return;

    const win = getCurrentWindow();
    let cancelled = false;

    const sync = () => {
      void win.isMaximized().then((value) => {
        if (!cancelled) setMaximized(value);
      });
    };

    sync();
    const unlisten = win.onResized(sync);

    return () => {
      cancelled = true;
      void unlisten.then((fn) => fn());
    };
  }, []);

  if (!IS_TAURI) return null;

  const buttonClass = cn(
    "inline-flex h-full w-[46px] items-center justify-center",
    "text-foreground/80 transition-colors duration-100",
  );

  return (
    <div
      className="flex self-stretch"
      style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Minimize"
        title="Minimize"
        className={cn(buttonClass, "hover:bg-muted")}
        onClick={() => void getCurrentWindow().minimize()}
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label={maximized ? "Restore" : "Maximize"}
        title={maximized ? "Restore" : "Maximize"}
        className={cn(buttonClass, "hover:bg-muted")}
        onClick={() => void getCurrentWindow().toggleMaximize()}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        title="Close"
        className={cn(buttonClass, "hover:bg-[#c42b1c] hover:text-white")}
        onClick={() => void getCurrentWindow().close()}
      >
        <CloseIcon />
      </button>
    </div>
  );
}
