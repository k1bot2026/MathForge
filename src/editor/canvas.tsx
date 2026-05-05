"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { blockRegistry, hydrateUserBlocksIntoRegistry } from "~/blocks";
import type { BlockDefinition } from "~/blocks/types";
import type { BlockNodeData } from "~/engine/graph-spec";
import { useAutoEvaluate } from "~/engine/use-auto-evaluate";
import { useGraphProjection } from "~/engine/use-graph-projection";
import { useUrlSync } from "~/engine/use-url-sync";
import type { MathType } from "~/math/types";
import { useGraphStore } from "~/store/graph-store";
import { useHistoryStore } from "~/store/history-store";
import { canConnect } from "./connections";
import { InspectorPanel } from "./inspector/inspector-panel";
import { LeftPanel } from "./left-panel";
import { BlockNode } from "./nodes/block-node";
import { OnboardingHint } from "./onboarding-hint";
import { ReplayBar } from "./replay-bar";
import { ReplayToggle } from "./replay-toggle";

const nodeTypes: NodeTypes = {
  block: BlockNode,
};

function defaultParams(def: BlockDefinition): Record<string, unknown> {
  if (def.params === undefined) return {};
  const out: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(def.params)) {
    out[key] = spec.default;
  }
  return out;
}

function CanvasInner() {
  useUrlSync();
  useAutoEvaluate();
  useEffect(() => {
    void hydrateUserBlocksIntoRegistry(blockRegistry);
  }, []);

  const liveNodes = useGraphStore((s) => s.nodes);
  const liveEdges = useGraphStore((s) => s.edges);
  const mode = useHistoryStore((s) => s.mode);
  const projection = useGraphProjection();
  const setSelected = useGraphStore((s) => s.setSelectedNodeId);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const connect = useGraphStore((s) => s.connect);
  const addNode = useGraphStore((s) => s.addNode);

  const { screenToFlowPosition } = useReactFlow();
  const dropCounterRef = useRef(0);

  const isReplay = mode === "replay";

  const nodes = useMemo<Node[]>(() => {
    if (!isReplay) return liveNodes;
    const justAppeared = new Set(projection.justAppearedIds);
    return projection.nodes.map((n) => ({
      ...n,
      data: { ...((n.data ?? {}) as object), justAppeared: justAppeared.has(n.id) },
    }));
  }, [isReplay, liveNodes, projection]);

  const edges: Edge[] = isReplay ? projection.edges : liveEdges;

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!isReplay) onNodesChange(changes);
    },
    [isReplay, onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (!isReplay) onEdgesChange(changes);
    },
    [isReplay, onEdgesChange],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (isReplay) return;
      const edge: Edge = {
        id: `e-${connection.source}-${connection.sourceHandle ?? "out"}-${connection.target}-${connection.targetHandle ?? "in"}`,
        source: connection.source,
        target: connection.target,
        ...(connection.sourceHandle !== null && connection.sourceHandle !== undefined
          ? { sourceHandle: connection.sourceHandle }
          : {}),
        ...(connection.targetHandle !== null && connection.targetHandle !== undefined
          ? { targetHandle: connection.targetHandle }
          : {}),
      };
      connect(edge);
    },
    [isReplay, connect],
  );

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

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isReplay) return;
      const blockId = e.dataTransfer.getData("application/mathforge-block-id");
      if (blockId === "") return;
      const def = blockRegistry.get(blockId);
      if (def === undefined) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      dropCounterRef.current += 1;
      const nodeId = `${blockId.replace(/\./g, "-")}-${dropCounterRef.current}`;

      const node: Node = {
        id: nodeId,
        type: "block",
        position,
        data: {
          blockId,
          params: defaultParams(def),
        } satisfies BlockNodeData,
      };
      addNode(node);
    },
    [isReplay, screenToFlowPosition, addNode],
  );

  const isEmpty = liveNodes.length === 0;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        {isEmpty ? <CanvasEmptyState /> : null}
      </ReactFlow>
      <CanvasToolbar />
      <InspectorPanel />
      {isReplay ? <ReplayBar /> : null}
    </div>
  );
}

function CanvasEmptyState() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
      data-testid="canvas-empty-state"
    >
      <p className="font-mono text-sm text-fg-muted">Drag a block from the library to start</p>
      <p className="font-mono text-xs text-fg-faint">or clear the canvas below to start fresh</p>
    </div>
  );
}

function CanvasToolbar() {
  const replaceGraph = useGraphStore((s) => s.replaceGraph);
  const liveNodes = useGraphStore((s) => s.nodes);

  function handleNewGraph() {
    replaceGraph([], [], "user");
  }

  return (
    <div
      data-testid="canvas-toolbar"
      className="absolute top-3 left-3 z-10 flex items-center gap-2"
    >
      <button
        type="button"
        onClick={handleNewGraph}
        disabled={liveNodes.length === 0}
        className="rounded border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-muted shadow-block-1 hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="new-graph-btn"
        title="Clear canvas and start a new graph"
      >
        New Graph
      </button>
    </div>
  );
}

export function EditorCanvas() {
  return (
    <div className="flex h-dvh w-full">
      <LeftPanel />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <ReplayToggle />
        <ReactFlowProvider>
          <CanvasInner />
        </ReactFlowProvider>
        <OnboardingHint />
      </div>
    </div>
  );
}
