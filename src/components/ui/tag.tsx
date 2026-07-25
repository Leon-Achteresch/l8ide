import { cn } from "@/lib/utils";
import { TAG_TONE_CLASS, toneFor, type TagTone } from "@/lib/tag-tone";

export function Tag({
  children,
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: TagTone }) {
  const label = typeof children === "string" ? children : "";
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide leading-4",
        TAG_TONE_CLASS[tone ?? toneFor(label)],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
