import { type SearchMatch } from "@/lib/search-store";
import { cn } from "@/lib/utils";

export function SearchMatchPreview({
  match,
  replaceValue,
}: {
  match: SearchMatch;
  replaceValue: string | null;
}) {
  const chars = Array.from(match.preview);
  const start = Math.min(match.column, chars.length);
  const end = Math.min(match.column + match.length, chars.length);
  const windowStart = start > 30 ? start - 20 : 0;
  return (
    <span className="min-w-0 flex-1 truncate font-mono text-[11px] leading-5 text-muted-foreground">
      {windowStart > 0 && <span className="opacity-40">…</span>}
      {chars.slice(windowStart, start).join("")}
      <span
        className={cn(
          "rounded-sm px-0.5 text-foreground",
          replaceValue !== null
            ? "bg-destructive/12 line-through decoration-destructive/60"
            : "bg-primary/15 ring-1 ring-primary/20",
        )}
      >
        {chars.slice(start, end).join("")}
      </span>
      {replaceValue !== null && (
        <span className="rounded-sm bg-emerald-500/12 px-0.5 text-foreground ring-1 ring-emerald-500/20">
          {replaceValue}
        </span>
      )}
      {chars.slice(end).join("")}
    </span>
  );
}
