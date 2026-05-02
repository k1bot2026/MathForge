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
import { useCallback, useMemo } from "react";
import { blockRegistry } from "~/blocks";
import type { BlockNodeData } from "~/engine/graph-spec";
import { useAutoEvaluate } from "~/engine/use-auto-evaluate";
import { useGraphProjection } from "~/engine/use-graph-projection";
import { useUrlSync } from "~/engine/use-url-sync";
import type { MathType } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { useHistoryStore } from "~/store/history-store";
import { canConnect } from "./connections";
import { InspectorPanel } from "./inspector/inspector-panel";
import { BlockNode } from "./nodes/block-node";
import { ReplayBar } from "./replay-bar";
import { ReplayToggle } from "./replay-toggle";

const nodeTypes: NodeTypes = {
  block: BlockNode,
};

export function EditorCanvas() {
  useUrlSync();
  useAutoEvaluate();
  const liveNodes = useGraphStore((s) => s.nodes);
  const liveEdges = useGraphStore((s) => s.edges);
  const mode = useHistoryStore((s) => s.mode);
  const projection = useGraphProjection();
  const setSelected = useGraphStore((s) => s.setSelectedNodeId);

  const isReplay = mode === "replay";

  // In replay mode the canvas reads the projected graph instead of the
  // live store, and tags `justAppeared: true` on the nodes whose ids
  // were touched by the last applied event so BlockNode can trigger
  // its glow CSS.
  const nodes = useMemo<Node[]>(() => {
    if (!isReplay) return liveNodes;
    const justAppeared = new Set(projection.justAppearedIds);
    return projection.nodes.map((n) => ({
      ...n,
      data: { ...((n.data ?? {}) as object), justAppeared: justAppeared.has(n.id) },
    }));
  }, [isReplay, liveNodes, projection]);

  const edges: Edge[] = isReplay ? projection.edges : liveEdges;

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
      <ReplayToggle />
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
      {isReplay ? <ReplayBar /> : null}
    </div>
  );
}
