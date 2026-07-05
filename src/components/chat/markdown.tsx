import { Fragment, type ReactNode } from "react";

// ponytail: minimaler MD-Renderer (Code-Fences, inline-Code, **fett**, - Listen).
// Baut React-Nodes statt innerHTML -> kein XSS, keine Dependency. Bei mehr Bedarf
// react-markdown einziehen.

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<strong key={`${keyBase}-b${i}`}>{tok.slice(2, -2)}</strong>);
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ content }: { content: string }) {
  const segments = content.split(/```/);
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed wrap-break-word">
      {segments.map((seg, i) => {
        if (i % 2 === 1) {
          const nl = seg.indexOf("\n");
          const code = nl >= 0 ? seg.slice(nl + 1) : seg;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md bg-muted/60 p-2.5 font-mono text-xs"
            >
              <code>{code.replace(/\n$/, "")}</code>
            </pre>
          );
        }
        return (
          <Fragment key={i}>
            {seg
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((para, p) => (
                <p key={p} className="whitespace-pre-wrap">
                  {inline(para, `${i}-${p}`)}
                </p>
              ))}
          </Fragment>
        );
      })}
    </div>
  );
}
