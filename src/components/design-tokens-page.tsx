import { invoke } from "@tauri-apps/api/core";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Loader2, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import {
  extractTokens,
  resolveColor,
  type Token,
} from "@/lib/design-tokens-core";
import { useWorkspaceStore } from "@/lib/workspace-store";

const CSS_RE = /\.(css|scss|less)$/;
const MAX_FILES = 60;

export function DesignTokensPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const [tokens, setTokens] = useState<Token[] | null>(null);

  useEffect(() => {
    if (!rootPath) return;
    let cancelled = false;
    void (async () => {
      const root = rootPath.replace(/\/+$/, "");
      const all = await invoke<string[]>("list_files", {
        root,
        hidden: [],
      }).catch(() => [] as string[]);
      const files = all.filter((f) => CSS_RE.test(f)).slice(0, MAX_FILES);
      const map = new Map<string, string>();
      for (const path of files) {
        const css = await readTextFile(path).catch(() => "");
        for (const t of extractTokens(css)) map.set(t.name, t.value);
      }
      if (cancelled) return;
      const merged = [...map.entries()]
        .map(([name, value]) => ({
          name,
          value,
          isColor: extractTokens(`x{${name}:${value}}`)[0]?.isColor ?? false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setTokens(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  if (!tokens) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Lese Design-Tokens…
      </div>
    );
  }

  const byName = new Map(tokens.map((t) => [t.name, t.value]));
  const colors = tokens.filter((t) => t.isColor);
  const others = tokens.filter((t) => !t.isColor);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-6 py-5">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">
            Design-Tokens
          </h1>
          <span className="text-xs text-muted-foreground">
            {colors.length} Farben · {others.length} weitere
          </span>
        </div>
        {tokens.length === 0 ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Keine CSS-Custom-Properties gefunden.
          </p>
        ) : (
          <>
            {colors.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {colors.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-2 rounded-lg bg-foreground/[0.03] p-2"
                  >
                    <span
                      className="size-8 shrink-0 rounded-md ring-1 ring-foreground/10"
                      style={{ background: resolveColor(t.value, byName) }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] text-foreground">
                        {t.name}
                      </p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {t.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {others.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg bg-foreground/[0.02]">
                {others.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-3 px-3 py-1.5 font-mono text-[11px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {t.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {t.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
