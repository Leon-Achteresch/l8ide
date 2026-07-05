export type SplitDirection = "row" | "col";

export type LeafNode = { type: "leaf"; id: string };
export type SplitNode = {
  type: "split";
  id: string;
  direction: SplitDirection;
  children: LayoutNode[];
};
export type LayoutNode = LeafNode | SplitNode;

export function collectLeaves(node: LayoutNode): string[] {
  return node.type === "leaf"
    ? [node.id]
    : node.children.flatMap(collectLeaves);
}

export function splitLeaf(
  node: LayoutNode,
  targetId: string,
  newLeafId: string,
  newSplitId: string,
  direction: SplitDirection,
): LayoutNode {
  if (node.type === "leaf") {
    if (node.id !== targetId) return node;
    return {
      type: "split",
      id: newSplitId,
      direction,
      children: [node, { type: "leaf", id: newLeafId }],
    };
  }
  if (node.direction === direction) {
    const idx = node.children.findIndex(
      (c) => c.type === "leaf" && c.id === targetId,
    );
    if (idx !== -1) {
      const children = [...node.children];
      children.splice(idx + 1, 0, { type: "leaf", id: newLeafId });
      return { ...node, children };
    }
  }
  return {
    ...node,
    children: node.children.map((c) =>
      splitLeaf(c, targetId, newLeafId, newSplitId, direction),
    ),
  };
}

export function removeLeaf(node: LayoutNode, targetId: string): LayoutNode {
  if (node.type === "leaf") return node;
  const children = node.children
    .map((c) =>
      c.type === "leaf" && c.id === targetId ? null : removeLeaf(c, targetId),
    )
    .filter((c): c is LayoutNode => c !== null);
  if (children.length === 1) return children[0];
  return { ...node, children };
}
