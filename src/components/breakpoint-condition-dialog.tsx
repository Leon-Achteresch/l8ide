import { useEffect, useState } from "react";
import { CircleDot, Hash, MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebugger } from "@/lib/debugger";
import { cn } from "@/lib/utils";

type Mode = "condition" | "log" | "hits";

export function BreakpointConditionDialog() {
  const target = useDebugger((s) => s.conditionTarget);
  const setTarget = useDebugger((s) => s.setConditionTarget);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<Mode>("condition");

  useEffect(() => {
    if (!target) return;
    const key = `${target.path}:${target.line}`;
    const s = useDebugger.getState();
    if (s.bpLogpoints[key]) {
      setMode("log");
      setValue(s.bpLogpoints[key]);
    } else if (s.bpHitCounts[key]) {
      setMode("hits");
      setValue(String(s.bpHitCounts[key]));
    } else {
      setMode("condition");
      setValue(s.bpConditions[key] ?? "");
    }
  }, [target]);

  if (!target) return null;
  const name = target.path.split("/").pop();

  const submit = () => {
    const s = useDebugger.getState();
    if (mode === "log") s.setBreakpointLogpoint(target.path, target.line, value);
    else if (mode === "hits")
      s.setBreakpointHitCount(target.path, target.line, Number(value) || 0);
    else s.setBreakpointCondition(target.path, target.line, value);
    setTarget(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && setTarget(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {mode === "log" ? (
              <MessageSquareText className="size-4 text-violet-500" />
            ) : mode === "hits" ? (
              <Hash className="size-4 text-sky-500" />
            ) : (
              <CircleDot className="size-4 text-amber-500" />
            )}
            {mode === "log"
              ? "Logpoint"
              : mode === "hits"
                ? "Hit-Count-Breakpoint"
                : "Bedingter Breakpoint"}{" "}
            · {name}:{target.line}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1">
          {(
            [
              ["condition", "Bedingung"],
              ["log", "Logpoint"],
              ["hits", "Hit-Count"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "h-6 rounded-md px-2 text-[11px] font-medium transition-colors",
                mode === m
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-foreground/8",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          autoFocus
          value={value}
          inputMode={mode === "hits" ? "numeric" : "text"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            mode === "log"
              ? "z.B. count ist {count} (leer = entfernen)"
              : mode === "hits"
                ? "z.B. 5 (leer/0 = entfernen)"
                : "z.B. count > 10 (leer = Bedingung entfernen)"
          }
          spellCheck={false}
          className="h-8 font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {mode === "log"
            ? "Loggt ohne anzuhalten; {ausdruck} wird interpoliert. ⏎ übernehmen."
            : mode === "hits"
              ? "Hält ab dem N-ten Treffer der Zeile. ⏎ übernehmen."
              : "Hält nur, wenn der Ausdruck truthy ist. ⏎ übernehmen."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
