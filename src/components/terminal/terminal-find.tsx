import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CaseSensitive, Regex, WholeWord, X } from "lucide-react";
import { getSession } from "@/lib/terminal";
import { cn } from "@/lib/utils";

type Options = { caseSensitive: boolean; wholeWord: boolean; regex: boolean };

const decorations = {
  matchOverviewRuler: "#f5a623",
  activeMatchColorOverviewRuler: "#f5a623",
  activeMatchBackground: "#f5a62366",
  matchBackground: "#f5a62333",
};

export function TerminalFind({ paneId, onClose }: { paneId: number; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [opts, setOpts] = useState<Options>({ caseSensitive: false, wholeWord: false, regex: false });
  const [result, setResult] = useState({ index: -1, count: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [paneId]);

  useEffect(() => {
    const search = getSession(paneId)?.search;
    if (!search) return;
    const sub = search.onDidChangeResults((e) =>
      setResult({ index: e.resultIndex, count: e.resultCount }),
    );
    return () => sub.dispose();
  }, [paneId]);

  function find(direction: 1 | -1) {
    const search = getSession(paneId)?.search;
    if (!search || !query) return;
    const options = { ...opts, decorations };
    if (direction > 0) search.findNext(query, options);
    else search.findPrevious(query, options);
  }

  useEffect(() => {
    const search = getSession(paneId)?.search;
    if (!query) {
      search?.clearDecorations();
      setResult({ index: -1, count: 0 });
      return;
    }
    search?.findNext(query, { ...opts, decorations, incremental: true });
  }, [query, opts, paneId]);

  function toggle(key: keyof Options) {
    setOpts((o) => ({ ...o, [key]: !o[key] }));
  }

  const iconBtn = "rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <div className="absolute right-3 top-2 z-30 flex items-center gap-1 rounded-md border bg-popover px-1.5 py-1 shadow-md">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") find(e.shiftKey ? -1 : 1);
          if (e.key === "Escape") onClose();
        }}
        placeholder="Suchen"
        className="h-6 w-44 bg-transparent px-1 text-xs outline-none"
      />
      <span className="min-w-14 text-right text-[11px] tabular-nums text-muted-foreground">
        {result.count ? `${result.index + 1}/${result.count}` : "Keine"}
      </span>
      <button className={cn(iconBtn, opts.caseSensitive && "bg-accent text-foreground")} onClick={() => toggle("caseSensitive")} title="Groß-/Kleinschreibung">
        <CaseSensitive className="size-3.5" />
      </button>
      <button className={cn(iconBtn, opts.wholeWord && "bg-accent text-foreground")} onClick={() => toggle("wholeWord")} title="Ganzes Wort">
        <WholeWord className="size-3.5" />
      </button>
      <button className={cn(iconBtn, opts.regex && "bg-accent text-foreground")} onClick={() => toggle("regex")} title="Regulärer Ausdruck">
        <Regex className="size-3.5" />
      </button>
      <button className={iconBtn} onClick={() => find(-1)} title="Vorheriger Treffer">
        <ArrowUp className="size-3.5" />
      </button>
      <button className={iconBtn} onClick={() => find(1)} title="Nächster Treffer">
        <ArrowDown className="size-3.5" />
      </button>
      <button className={iconBtn} onClick={onClose} title="Schließen">
        <X className="size-3.5" />
      </button>
    </div>
  );
}
