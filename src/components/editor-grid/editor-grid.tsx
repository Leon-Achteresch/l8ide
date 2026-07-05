import { EditorGroup } from "@/components/editor-grid/editor-group";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { LayoutNode } from "@/lib/editor-groups";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Fragment } from "react";

function renderNode(node: LayoutNode) {
  if (node.type === "leaf") return <EditorGroup id={node.id} />;
  return (
    <ResizablePanelGroup
      orientation={node.direction === "row" ? "horizontal" : "vertical"}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          {i > 0 && <ResizableHandle />}
          <ResizablePanel id={child.id} minSize={10} className="flex min-h-0 min-w-0">
            {renderNode(child)}
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}

export function EditorGrid() {
  const layout = useWorkspaceStore((s) => s.layout);
  return renderNode(layout);
}
