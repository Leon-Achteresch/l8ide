export type Specificity = [number, number, number];

export function cmpSpecificity(x: Specificity, y: Specificity): number {
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export function specificity(selector: string): Specificity {
  let a = 0;
  let b = 0;
  let c = 0;
  let sel = selector;

  sel = sel.replace(
    /::?(is|matches|not|has|where)\(([^()]*)\)/gi,
    (_m, name: string, inner: string) => {
      if (name.toLowerCase() === "where") return " ";
      let best: Specificity = [0, 0, 0];
      for (const part of inner.split(",")) {
        const s = specificity(part);
        if (cmpSpecificity(s, best) > 0) best = s;
      }
      a += best[0];
      b += best[1];
      c += best[2];
      return " ";
    },
  );

  const count = (re: RegExp) => (sel.match(re) ?? []).length;
  const strip = (re: RegExp) => {
    sel = sel.replace(re, " ");
  };

  a += count(/#[\w-]+/g);
  strip(/#[\w-]+/g);

  c += count(/::[\w-]+|:(?:before|after|first-line|first-letter)\b/gi);
  strip(/::[\w-]+|:(?:before|after|first-line|first-letter)\b/gi);

  b += count(/:[\w-]+\([^()]*\)/g);
  strip(/:[\w-]+\([^()]*\)/g);

  b += count(/\.[\w-]+/g);
  strip(/\.[\w-]+/g);

  b += count(/\[[^\]]*\]/g);
  strip(/\[[^\]]*\]/g);

  b += count(/:[\w-]+/g);
  strip(/:[\w-]+/g);

  c += count(/[a-zA-Z][\w-]*/g);

  return [a, b, c];
}

export function formatSpecificity(s: Specificity): string {
  return `(${s[0]},${s[1]},${s[2]})`;
}
