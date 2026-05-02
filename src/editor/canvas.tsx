"use client";

import { Background, BackgroundVariant, type NodeTypes, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraphStore } from "~/store/graph-store";
import { PlaceholderNode } from "./nodes/placeholder/placeholder-node";

const nodeTypes: NodeTypes = {
  placeholder: PlaceholderNode,
};

export function EditorCanvas() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  return (
    <div className="h-dvh w-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
