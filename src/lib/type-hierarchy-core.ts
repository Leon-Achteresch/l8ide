import type ts from "typescript";

export type TypeHierarchyDirection = "base" | "derived";

export type TypeHierarchyNode = {
  name: string;
  file: string;
  line: number;
  column: number;
  offset: number;
};

type TypeDeclaration = ts.ClassDeclaration | ts.InterfaceDeclaration;

function isTypeDeclaration(api: typeof ts, node: ts.Node): node is TypeDeclaration {
  return api.isClassDeclaration(node) || api.isInterfaceDeclaration(node);
}

function symbolDeclaration(api: typeof ts, symbol: ts.Symbol | undefined): TypeDeclaration | null {
  return symbol?.declarations?.find((node): node is TypeDeclaration =>
    isTypeDeclaration(api, node) && !!node.name,
  ) ?? null;
}

function declarationAt(
  api: typeof ts,
  program: ts.Program,
  fileName: string,
  offset: number,
): TypeDeclaration | null {
  const source = program.getSourceFile(fileName);
  if (!source || offset < 0 || offset > source.end) return null;
  const checker = program.getTypeChecker();
  let node: ts.Node = source;
  while (true) {
    let child: ts.Node | undefined;
    api.forEachChild(node, (candidate) => {
      if (candidate.getStart(source) <= offset && offset < candidate.end) {
        child = candidate;
        return true;
      }
      return undefined;
    });
    if (!child) break;
    node = child;
  }
  // Invoking on a type reference should show that type's hierarchy.
  if (api.isIdentifier(node)) {
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & api.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbolDeclaration(api, symbol);
    if (declaration) return declaration;
  }
  for (let parent: ts.Node | undefined = node; parent; parent = parent.parent) {
    if (isTypeDeclaration(api, parent) && parent.name) return parent;
  }
  return null;
}

function asNode(declaration: TypeDeclaration): TypeHierarchyNode {
  const source = declaration.getSourceFile();
  const offset = declaration.name!.getStart(source);
  const position = source.getLineAndCharacterOfPosition(offset);
  return {
    name: declaration.name!.text,
    file: source.fileName,
    line: position.line + 1,
    column: position.character + 1,
    offset,
  };
}

function directBases(
  api: typeof ts,
  checker: ts.TypeChecker,
  declaration: TypeDeclaration,
): TypeDeclaration[] {
  const result: TypeDeclaration[] = [];
  const seen = new Set<ts.Symbol>();
  for (const clause of declaration.heritageClauses ?? []) {
    for (const type of clause.types) {
      let symbol = checker.getSymbolAtLocation(type.expression);
      if (symbol && symbol.flags & api.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      const base = symbolDeclaration(api, symbol);
      if (base) result.push(base);
    }
  }
  return result;
}

export function getTypeHierarchy(
  api: typeof ts,
  program: ts.Program,
  fileName: string,
  offset: number,
  direction: TypeHierarchyDirection,
): { root: TypeHierarchyNode | null; types: TypeHierarchyNode[] } {
  const declaration = declarationAt(api, program, fileName, offset);
  if (!declaration) return { root: null, types: [] };
  const checker = program.getTypeChecker();
  const root = asNode(declaration);
  if (direction === "base") {
    return { root, types: directBases(api, checker, declaration).map(asNode) };
  }

  const target = checker.getSymbolAtLocation(declaration.name!);
  if (!target) return { root, types: [] };
  const types: TypeHierarchyNode[] = [];
  for (const source of program.getSourceFiles()) {
    const visit = (node: ts.Node) => {
      if (isTypeDeclaration(api, node) && node.name) {
        if (directBases(api, checker, node).some((base) =>
          checker.getSymbolAtLocation(base.name!) === target,
        )) types.push(asNode(node));
      }
      api.forEachChild(node, visit);
    };
    api.forEachChild(source, visit);
  }
  return { root, types };
}
