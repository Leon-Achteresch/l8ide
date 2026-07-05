import type * as monaco from "monaco-editor";
import { typescript as tsLanguages } from "monaco-editor";
import {
  Box,
  Braces,
  Circle,
  Hash,
  type LucideIcon,
  Package,
  Parentheses,
  SquareFunction,
  Type,
  Variable,
} from "lucide-react";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { monacoUriForPath } from "@/lib/monaco-uri";

export { symbolChainAt } from "@/lib/outline-chain";

export type OutlineNode = {
  name: string;
  kind: string;
  line: number;
  column: number;
  endLine: number;
  children: OutlineNode[];
};

const KIND_ICONS: Record<string, LucideIcon> = {
  class: Box,
  interface: Braces,
  enum: Hash,
  "enum member": Hash,
  function: SquareFunction,
  "local function": SquareFunction,
  method: SquareFunction,
  constructor: Parentheses,
  getter: Variable,
  setter: Variable,
  property: Variable,
  var: Variable,
  let: Variable,
  const: Variable,
  module: Package,
  type: Type,
  "type parameter": Type,
  alias: Type,
};

export function kindIcon(kind: string): LucideIcon {
  return KIND_ICONS[kind] ?? Circle;
}

export function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
  const out: OutlineNode[] = [];
  const walk = (n: OutlineNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

type NavTree = {
  text: string;
  kind: string;
  spans: { start: number; length: number }[];
  childItems?: NavTree[];
};

type NavWorker = {
  getNavigationTree(fileName: string): Promise<NavTree | undefined>;
};

const LANGS = ["typescript", "javascript"];

export function isOutlineLanguage(languageId: string | undefined): boolean {
  return !!languageId && LANGS.includes(languageId);
}

function mapNode(node: NavTree, model: monaco.editor.ITextModel): OutlineNode {
  const span = node.spans[0];
  const pos = span
    ? model.getPositionAt(span.start)
    : { lineNumber: 1, column: 1 };
  const endLine = span
    ? model.getPositionAt(span.start + span.length).lineNumber
    : pos.lineNumber;
  return {
    name: node.text,
    kind: node.kind,
    line: pos.lineNumber,
    column: pos.column,
    endLine,
    children: (node.childItems ?? []).map((c) => mapNode(c, model)),
  };
}

export async function getOutline(path: string): Promise<OutlineNode[]> {
  const m = getMonacoInstance();
  if (!m) return [];
  const model = m.editor.getModel(monacoUriForPath(path));
  if (!model || !isOutlineLanguage(model.getLanguageId())) return [];
  try {
    const getWorker =
      model.getLanguageId() === "javascript"
        ? tsLanguages.getJavaScriptWorker
        : tsLanguages.getTypeScriptWorker;
    const accessor = await getWorker();
    const worker = (await accessor(model.uri)) as unknown as NavWorker;
    const tree = await worker.getNavigationTree(model.uri.toString());
    if (!tree?.childItems) return [];
    return tree.childItems.map((c) => mapNode(c, model));
  } catch {
    return [];
  }
}
