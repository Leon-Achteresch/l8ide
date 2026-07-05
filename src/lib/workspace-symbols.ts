import { typescript as tsLanguages } from "monaco-editor";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { pathFromMonacoUri } from "@/lib/monaco-uri";

export type WorkspaceSymbol = {
  name: string;
  kind: string;
  container: string;
  path: string;
  line: number;
  column: number;
};

type NavItem = {
  name: string;
  kind: string;
  fileName: string;
  textSpan: { start: number; length: number };
  containerName: string;
};

type NavWorker = {
  getNavigateToItems(
    searchValue: string,
    maxResultCount?: number,
  ): Promise<NavItem[]>;
};

export async function getWorkspaceSymbols(
  query: string,
): Promise<WorkspaceSymbol[]> {
  const q = query.trim();
  if (!q) return [];
  const m = getMonacoInstance();
  if (!m) return [];
  const models = m.editor.getModels();
  const model =
    models.find((md) => md.getLanguageId() === "typescript") ??
    models.find((md) => md.getLanguageId() === "javascript");
  if (!model) return [];
  try {
    const getWorker =
      model.getLanguageId() === "javascript"
        ? tsLanguages.getJavaScriptWorker
        : tsLanguages.getTypeScriptWorker;
    const accessor = await getWorker();
    const worker = (await accessor(model.uri)) as unknown as NavWorker;
    const items = await worker.getNavigateToItems(q, 256);
    const out: WorkspaceSymbol[] = [];
    for (const item of items) {
      const target = m.editor.getModel(m.Uri.parse(item.fileName));
      if (!target) continue;
      const path = pathFromMonacoUri(target.uri);
      if (!path) continue;
      const pos = target.getPositionAt(item.textSpan.start);
      out.push({
        name: item.name,
        kind: item.kind,
        container: item.containerName ?? "",
        path,
        line: pos.lineNumber,
        column: pos.column,
      });
    }
    return out;
  } catch {
    return [];
  }
}
