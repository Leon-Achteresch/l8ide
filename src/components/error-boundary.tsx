import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { flushBackups } from "@/lib/hot-exit";
import { copyText } from "@/lib/path-actions";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  label: string;
  variant?: "panel" | "app";
};

type State = { error: Error | null; stack: string };

async function reloadWindow() {
  await flushBackups();
  window.location.reload();
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ stack: info.componentStack ?? "" });
    console.error(`[l8ide] ${this.props.label} ist abgestürzt`, error, info);
    void flushBackups();
  }

  render() {
    const { error, stack } = this.state;
    const { children, label, variant = "panel" } = this.props;
    if (!error) return children;

    const details = `${label}\n${error.stack ?? error.message}\n${stack}`;

    return (
      <div
        className={cn(
          "flex items-center justify-center p-6",
          variant === "app" ? "h-screen w-screen" : "size-full min-h-40",
        )}
      >
        <div className="w-full max-w-md rounded-xl bg-card p-5 text-card-foreground shadow-float">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/12">
              <TriangleAlert className="size-4 text-amber-500" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{label} ist abgestürzt</p>
              <p className="text-xs text-muted-foreground">
                {variant === "app"
                  ? "Ungespeicherte Änderungen wurden gesichert."
                  : "Der Rest der IDE läuft weiter."}
              </p>
            </div>
          </div>

          <p className="mb-4 max-h-24 overflow-y-auto rounded-lg bg-foreground/[0.04] p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {error.message || String(error)}
          </p>

          <div className="flex items-center gap-2">
            {variant === "app" ? (
              <button
                type="button"
                onClick={() => void reloadWindow()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90"
              >
                <RotateCcw className="size-3.5" strokeWidth={2} />
                Neu laden
              </button>
            ) : (
              <button
                type="button"
                onClick={() => this.setState({ error: null, stack: "" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity duration-150 hover:opacity-90"
              >
                <RotateCcw className="size-3.5" strokeWidth={2} />
                Erneut versuchen
              </button>
            )}
            <button
              type="button"
              onClick={() => copyText(details, "Fehlerdetails kopiert")}
              className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.06] hover:text-foreground"
            >
              Details kopieren
            </button>
          </div>
        </div>
      </div>
    );
  }
}
