import { Copy, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { httpToCurl } from "@/lib/curl-to-http";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_PANEL } from "@/lib/ease";
import { useHttpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";

function statusColor(status: string): string {
  const code = Number(/\b(\d{3})\b/.exec(status)?.[1] ?? 0);
  if (code >= 500) return "text-red-500";
  if (code >= 400) return "text-amber-500";
  if (code >= 200 && code < 300) return "text-emerald-500";
  return "text-muted-foreground";
}

function prettyBody(body: string): string {
  const t = body.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export function HttpClientPanel() {
  const open = useHttpClient((s) => s.open);
  const running = useHttpClient((s) => s.running);
  const request = useHttpClient((s) => s.request);
  const status = useHttpClient((s) => s.status);
  const headers = useHttpClient((s) => s.headers);
  const body = useHttpClient((s) => s.body);
  const ms = useHttpClient((s) => s.ms);
  const error = useHttpClient((s) => s.error);
  const environment = useHttpClient((s) => s.environment);
  const setEnvironment = useHttpClient((s) => s.setEnvironment);
  const close = useHttpClient((s) => s.close);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={SPRING_PANEL}
          className="fixed bottom-8 right-3 top-12 z-40 flex w-[min(460px,90vw)] flex-col overflow-hidden rounded-2xl bg-popover shadow-xl ring-1 ring-foreground/10 backdrop-blur-xl"
        >
          <div className="flex h-9 shrink-0 items-center gap-2 bg-foreground/[0.04] px-3">
            <Send className="size-3.5 text-violet-500" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {request?.name ?? "HTTP"}
            </span>
            <input
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              title="Environment (aus .l8ide/http-env.json)"
              spellCheck={false}
              className="h-5 w-20 rounded bg-foreground/[0.06] px-1.5 text-[10px] text-foreground outline-none focus:bg-foreground/10"
            />
            {running ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : (
              status && (
                <span className={cn("font-mono text-[11px] font-semibold", statusColor(status))}>
                  {status.replace(/^HTTP\/[\d.]+\s*/, "")} · {ms}ms
                </span>
              )
            )}
            {request && (
              <button
                type="button"
                title="Als cURL kopieren"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(httpToCurl(request))
                    .then(() => toast.success("cURL kopiert"));
                }}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
              >
                <Copy className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : running ? (
              <p className="text-xs text-muted-foreground">Sende Anfrage…</p>
            ) : (
              <>
                {headers && (
                  <pre className="mb-3 whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {headers}
                  </pre>
                )}
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">
                  {prettyBody(body)}
                </pre>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
