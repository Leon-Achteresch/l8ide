import { useEffect } from "react";
import { ExternalLink, Radio, Server, Square } from "lucide-react";
import { toast } from "sonner";
import {
  initPortsPolling,
  killPort,
  openPortInBrowser,
  usePortsStore,
} from "@/lib/ports-store";

export function ProcessDashboardPage() {
  const ports = usePortsStore((s) => s.ports);

  useEffect(() => {
    initPortsPolling();
  }, []);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-5">
        <div className="flex items-center gap-2">
          <Server className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">
            Dev-Prozesse
          </h1>
          <span className="text-xs text-muted-foreground">
            {ports.length} laufend · aktualisiert automatisch
          </span>
        </div>
        {ports.length === 0 ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Keine lauschenden Dev-Server erkannt. Starte z.B. einen Vite- oder
            Node-Server, und er erscheint hier.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg bg-foreground/[0.02]">
            {ports.map((p) => (
              <div
                key={`${p.pid}:${p.port}`}
                className="group flex items-center gap-3 px-3 py-2 text-xs"
              >
                <Radio className="size-3.5 shrink-0 text-emerald-500" />
                <span className="w-16 shrink-0 font-mono font-medium text-foreground">
                  :{p.port}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">
                  {p.process}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">
                  PID {p.pid}
                </span>
                <button
                  type="button"
                  title="Im Browser öffnen"
                  onClick={() => openPortInBrowser(p.port)}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-foreground group-hover:opacity-100"
                >
                  <ExternalLink className="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Prozess beenden"
                  onClick={() =>
                    toast.warning(`Prozess auf Port ${p.port} beenden?`, {
                      description: `${p.process} (PID ${p.pid})`,
                      action: {
                        label: "Beenden",
                        onClick: () => void killPort(p.pid),
                      },
                    })
                  }
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-foreground/8 hover:text-red-500 group-hover:opacity-100"
                >
                  <Square className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
