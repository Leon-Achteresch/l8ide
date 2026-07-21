import { Regex } from "lucide-react";
import { useMemo, useState } from "react";
import { create } from "zustand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { runRegex } from "@/lib/regex-tester-core";
import { cn } from "@/lib/utils";

export const useRegexTester = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

const FLAGS = ["g", "i", "m", "s", "u"];

function Highlighted({
  text,
  matches,
}: {
  text: string;
  matches: { index: number; length: number }[];
}) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.index < cursor) return;
    if (m.index > cursor) parts.push(text.slice(cursor, m.index));
    parts.push(
      <mark key={i} className="rounded-sm bg-amber-400/40 text-inherit">
        {text.slice(m.index, m.index + m.length) || "∅"}
      </mark>,
    );
    cursor = m.index + m.length;
  });
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function RegexTesterDialog() {
  const open = useRegexTester((s) => s.open);
  const setOpen = useRegexTester((s) => s.setOpen);
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("");

  const result = useMemo(
    () => runRegex(pattern, flags, text),
    [pattern, flags, text],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Regex className="size-4 text-muted-foreground" />
            Regex-Tester
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm text-muted-foreground">/</span>
          <Input
            autoFocus
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Muster"
            spellCheck={false}
            className={cn(
              "h-8 flex-1 font-mono text-xs",
              !result.ok && "border-red-500",
            )}
          />
          <span className="font-mono text-sm text-muted-foreground">/</span>
          <div className="flex gap-0.5">
            {FLAGS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() =>
                  setFlags((cur) =>
                    cur.includes(f) ? cur.replace(f, "") : cur + f,
                  )
                }
                className={cn(
                  "size-7 rounded-md font-mono text-xs transition-colors",
                  flags.includes(f)
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:bg-foreground/8",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {!result.ok && (
          <p className="-mt-1 text-[11px] text-red-500">{result.error}</p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Testtext…"
          spellCheck={false}
          rows={5}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus-visible:border-ring"
        />
        <div className="rounded-md bg-foreground/[0.03] px-2.5 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {result.ok ? `${result.matches.length} Treffer` : "Fehler"}
          </p>
          {result.ok && (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">
              <Highlighted text={text} matches={result.matches} />
            </pre>
          )}
          {result.ok &&
            result.matches.some((m) => m.groups.length > 0) && (
              <div className="mt-2 space-y-0.5 border-t pt-2">
                {result.matches.slice(0, 20).map((m, i) => (
                  <p
                    key={i}
                    className="truncate font-mono text-[10px] text-muted-foreground"
                  >
                    #{i + 1}: {m.text}
                    {m.groups.length > 0 &&
                      ` → [${m.groups.map((g) => `"${g}"`).join(", ")}]`}
                  </p>
                ))}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
