"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { blockRegistry } from "~/blocks";
import type { BlockNodeData } from "~/engine/graph-spec";
import { useAutoEvaluate } from "~/engine/use-auto-evaluate";
import type { MathType } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { canConnect } from "./connections";
import { InspectorPanel } from "./inspector/inspector-panel";
import { BlockNode } from "./nodes/block-node";

const nodeTypes: NodeTypes = {
  block: BlockNode,
};

export function EditorCanvas() {
  useAutoEvaluate();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const setSelected = useGraphStore((s) => s.setSelectedNodeId);

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      setSelected(node.id);
    },
    [setSelected],
  );

  const onPaneClick = useCallback(() => {
    setSelected(null);
  }, [setSelected]);

  const isValidConnection = useCallback((connection: Connection | Edge): boolean => {
    const { nodes: current } = useGraphStore.getState();
    const sourceNode = current.find((n) => n.id === connection.source);
    const targetNode = current.find((n) => n.id === connection.target);
    if (sourceNode === undefined || targetNode === undefined) return false;
    const sourceData = sourceNode.data as Partial<BlockNodeData>;
    const targetData = targetNode.data as Partial<BlockNodeData>;
    const sourceDef = blockRegistry.get(sourceData.blockId ?? "");
    const targetDef = blockRegistry.get(targetData.blockId ?? "");
    if (sourceDef === undefined || targetDef === undefined) return false;
    const outPort = sourceDef.outputs.find((p) => p.id === (connection.sourceHandle ?? "value"));
    const inPort = targetDef.inputs.find((p) => p.id === (connection.targetHandle ?? ""));
    if (outPort === undefined || inPort === undefined) return false;
    // Phase 1: polymorphic outputs receive empty input-types map. Concrete
    // output types resolve immediately; polymorphic ones fall back to a
    // permissive accept (the evaluator catches mismatches at compute time).
    let outType: MathType;
    if (typeof outPort.type === "function") {
      try {
        outType = outPort.type({});
      } catch {
        return true;
      }
    } else {
      outType = outPort.type;
    }
    return canConnect(outType, inPort.type).ok;
  }, []);

  return (
    <div className="relative h-dvh w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
      </ReactFlow>
      <InspectorPanel />
    </div>
  );
}
