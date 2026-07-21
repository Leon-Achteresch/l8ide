import { Wand2 } from "lucide-react";
import { create } from "zustand";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { runTransform, TRANSFORMS } from "@/lib/text-transforms";
import { cn } from "@/lib/utils";

export const useTransformPalette = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

function focusedEditor() {
  const editors = getMonacoInstance()?.editor.getEditors() ?? [];
  return editors.find((e) => e.hasTextFocus()) ?? editors[0] ?? null;
}

export function TransformPalette() {
  const open = useTransformPalette((s) => s.open);
  const setOpen = useTransformPalette((s) => s.setOpen);
  if (!open) return null;

  const apply = (id: string) => {
    setOpen(false);
    const editor = focusedEditor();
    const model = editor?.getModel();
    const sel = editor?.getSelection();
    if (!editor || !model || !sel || sel.isEmpty()) {
      toast.info("Bitte zuerst Text markieren.");
      return;
    }
    const input = model.getValueInRange(sel);
    try {
      const output = runTransform(id, input);
      editor.executeEdits("transform", [{ range: sel, text: output }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <div
        data-overlay
        className="fixed inset-0 z-40"
        onMouseDown={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-10 z-50 flex justify-center px-4",
          "animate-in fade-in-0 slide-in-from-top-1 duration-100",
        )}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command loop>
            <CommandInput placeholder="Selektion umwandeln…" autoFocus />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">Keine Transformation</span>
              </CommandEmpty>
              <CommandGroup heading="Umwandeln">
                {TRANSFORMS.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.label}
                    onSelect={() => apply(t.id)}
                  >
                    <Wand2 className="size-3.5 shrink-0 text-violet-500" />
                    <span>{t.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
