export const TAG_TONES = [
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "orange",
  "fuchsia",
] as const;

export type TagTone = (typeof TAG_TONES)[number];

export const TAG_TONE_CLASS: Record<TagTone, string> = {
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  blue: "bg-blue-500/12 text-blue-600 dark:text-blue-300",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  cyan: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300",
  orange: "bg-orange-500/12 text-orange-600 dark:text-orange-300",
  fuchsia: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300",
};

export function toneFor(label: string): TagTone {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0;
  }
  return TAG_TONES[Math.abs(hash) % TAG_TONES.length];
}
