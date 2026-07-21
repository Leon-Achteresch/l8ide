import type * as monacoNs from "monaco-editor";
import {
  cmpSpecificity,
  formatSpecificity,
  specificity,
} from "@/lib/css-specificity-core";

const CSS_LANGS = ["css", "scss", "less"];

export function registerCssSpecificity(m: typeof monacoNs) {
  m.languages.registerHoverProvider(CSS_LANGS, {
    provideHover(model, position) {
      const raw = model.getLineContent(position.lineNumber).replace(/\s+$/, "");
      if (!raw.endsWith("{")) return null;
      const text = raw.replace(/\{$/, "").trim();
      if (!text || text.startsWith("@")) return null;
      const selectors = text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (selectors.length === 0) return null;

      const scored = selectors.map((s) => ({ sel: s, spec: specificity(s) }));
      let max = scored[0].spec;
      for (const s of scored) if (cmpSpecificity(s.spec, max) > 0) max = s.spec;

      const lines = scored.map(({ sel, spec }) => {
        const tag = formatSpecificity(spec);
        const top = scored.length > 1 && cmpSpecificity(spec, max) === 0;
        return `- \`${sel}\` → **${tag}**${top ? " ◂ am spezifischsten" : ""}`;
      });
      const col = raw.indexOf("{") + 1 || raw.length + 1;
      return {
        range: new m.Range(position.lineNumber, 1, position.lineNumber, col),
        contents: [
          { value: `**Spezifität** (ID, Klasse, Typ)` },
          { value: lines.join("\n") },
        ],
      };
    },
  });
}
