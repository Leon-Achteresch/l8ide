export function countWords(text: string): number {
  const m = text.match(/[^\s]+/g);
  return m ? m.length : 0;
}

export function selectionStats(text: string): {
  chars: number;
  words: number;
  lines: number;
} {
  if (text.length === 0) return { chars: 0, words: 0, lines: 0 };
  return {
    chars: text.length,
    words: countWords(text),
    lines: text.split("\n").length,
  };
}
