import { useEffect, useState } from "react";
import { CircleDot } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebugger } from "@/lib/debugger";

export function BreakpointConditionDialog() {
  const target = useDebugger((s) => s.conditionTarget);
  const setTarget = useDebugger((s) => s.setConditionTarget);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (target) {
      setValue(
        useDebugger.getState().bpConditions[
          `${target.path}:${target.line}`
        ] ?? "",
      );
    }
  }, [target]);

  if (!target) return null;
  const name = target.path.split("/").pop();

  const submit = () => {
    useDebugger
      .getState()
      .setBreakpointCondition(target.path, target.line, value);
    setTarget(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && setTarget(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CircleDot className="size-4 text-amber-500" />
            Bedingter Breakpoint · {name}:{target.line}
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="z.B. count > 10 (leer = Bedingung entfernen)"
          spellCheck={false}
          className="h-8 font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Hält nur, wenn der Ausdruck truthy ist. ⏎ übernehmen.
        </p>
      </DialogContent>
    </Dialog>
  );
}
