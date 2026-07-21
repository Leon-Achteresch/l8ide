import { exists } from "@tauri-apps/plugin-fs";
import type * as monacoNs from "monaco-editor";
import {
  extractLinks,
  isLocalLink,
  stripAnchor,
} from "@/lib/markdown-links-core";
import { clearTaskMarkers, setTaskMarkers } from "@/lib/markers-store";

const MD_SOURCE = 90002;
const markers = new Map<string, { line: number; column: number; message: string }[]>();

function flush() {
  const all = [...markers.entries()].flatMap(([path, findings]) =>
    findings.map((f) => ({
      path,
      line: f.line,
      column: f.column,
      severity: "warning" as const,
      message: f.message,
    })),
  );
  setTaskMarkers(MD_SOURCE, all);
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "";
}

function resolveRel(fromDir: string, target: string): string {
  const parts = `${fromDir}/${target}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    else if (p === "..") out.pop();
    else out.push(p);
  }
  return `/${out.join("/")}`;
}

export function attachMarkdownLinks(
  editor: monacoNs.editor.ICodeEditor,
  path: string,
) {
  if (!/\.(md|markdown|mdx)$/i.test(path)) return;
  const dir = dirOf(path);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    const model = editor.getModel();
    if (!model) return;
    const links = extractLinks(model.getValue()).filter(
      (l) => isLocalLink(l.target) && stripAnchor(l.target),
    );
    const found: { line: number; column: number; message: string }[] = [];
    for (const l of links) {
      const abs = resolveRel(dir, stripAnchor(l.target));
      if (!(await exists(abs).catch(() => true))) {
        found.push({
          line: l.line,
          column: l.column,
          message: `${l.isImage ? "Bild" : "Link"} zeigt ins Leere: ${l.target}`,
        });
      }
    }
    if (found.length > 0) markers.set(path, found);
    else markers.delete(path);
    flush();
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 700);
  };
  void run();
  const sub = editor.onDidChangeModelContent(schedule);
  editor.onDidDispose(() => {
    clearTimeout(timer);
    sub.dispose();
    if (markers.delete(path)) flush();
    if (markers.size === 0) clearTaskMarkers(MD_SOURCE);
  });
}
