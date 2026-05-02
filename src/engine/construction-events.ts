// Construction Protocol event log + pure projection reducer.
//
// The history store records ConstructionEvents as the user (or template
// loader) builds a graph. projectGraph(events, step) is a pure function
// that replays the first `step` events over an empty initial state and
// returns the resulting nodes/edges plus the ids touched by event
// `step - 1` — those are the ids the canvas glows in replay mode.
//
// Pure-function design: no React, no Zustand, no I/O. Trivially
// unit-testable and memoizable. The history-store wraps this reducer
// with the events array + currentStep cursor.

import type { Edge, Node } from "@xyflow/react";
import type { ResolvedParams } from "~/blocks/types";

export type NodeSnapshot = Pick<Node, "id" | "type" | "position" | "data">;
export type EdgeSnapshot = Pick<Edge, "id" | "source" | "target" | "sourceHandle" | "targetHandle">;

export type ConstructionEvent =
  | { kind: "node-added"; node: NodeSnapshot; at: number }
  | { kind: "node-removed"; nodeId: string; at: number }
  | { kind: "node-moved"; nodeId: string; position: { x: number; y: number }; at: number }
  | { kind: "params-updated"; nodeId: string; params: ResolvedParams; at: number }
  | { kind: "edge-added"; edge: EdgeSnapshot; at: number }
  | { kind: "edge-removed"; edgeId: string; at: number }
  | { kind: "graph-reset"; reason: "seed" | "url-hash" | "template" | "user"; at: number };

export type Projection = {
  nodes: Node[];
  edges: Edge[];
  /** Ids touched by the last applied event — drives the canvas glow. */
  justAppearedIds: string[];
};

export function projectGraph(events: readonly ConstructionEvent[], step: number): Projection {
  const clamped = Math.max(0, Math.min(step, events.length));
  let nodes: Node[] = [];
  let edges: Edge[] = [];
  let justAppearedIds: string[] = [];

  for (let i = 0; i < clamped; i++) {
    const ev = events[i];
    if (ev === undefined) continue;
    const isLast = i === clamped - 1;
    switch (ev.kind) {
      case "node-added": {
        const cloned: Node = {
          id: ev.node.id,
          type: ev.node.type,
          position: { x: ev.node.position.x, y: ev.node.position.y },
          data: ev.node.data,
        };
        nodes = [...nodes, cloned];
        if (isLast) justAppearedIds = [ev.node.id];
        break;
      }
      case "node-removed":
        nodes = nodes.filter((n) => n.id !== ev.nodeId);
        edges = edges.filter((e) => e.source !== ev.nodeId && e.target !== ev.nodeId);
        if (isLast) justAppearedIds = [ev.nodeId];
        break;
      case "node-moved":
        nodes = nodes.map((n) =>
          n.id === ev.nodeId ? { ...n, position: { x: ev.position.x, y: ev.position.y } } : n,
        );
        if (isLast) justAppearedIds = [ev.nodeId];
        break;
      case "params-updated":
        nodes = nodes.map((n) => {
          if (n.id !== ev.nodeId) return n;
          const data = (n.data ?? {}) as Record<string, unknown>;
          return { ...n, data: { ...data, params: ev.params } };
        });
        if (isLast) justAppearedIds = [ev.nodeId];
        break;
      case "edge-added": {
        const cloned: Edge = {
          id: ev.edge.id,
          source: ev.edge.source,
          target: ev.edge.target,
          ...(ev.edge.sourceHandle !== undefined && ev.edge.sourceHandle !== null
            ? { sourceHandle: ev.edge.sourceHandle }
            : {}),
          ...(ev.edge.targetHandle !== undefined && ev.edge.targetHandle !== null
            ? { targetHandle: ev.edge.targetHandle }
            : {}),
        };
        edges = [...edges, cloned];
        if (isLast) justAppearedIds = [ev.edge.id];
        break;
      }
      case "edge-removed":
        edges = edges.filter((e) => e.id !== ev.edgeId);
        if (isLast) justAppearedIds = [ev.edgeId];
        break;
      case "graph-reset":
        nodes = [];
        edges = [];
        if (isLast) justAppearedIds = [];
        break;
    }
  }

  return { nodes, edges, justAppearedIds };
}

/**
 * Synthesize a "construct from scratch" event sequence for an existing
 * graph snapshot. Used by replaceGraph (URL hash, template load, seed)
 * so the replay UI has something meaningful to scrub even when the
 * graph wasn't built up interactively. Order: graph-reset, then nodes
 * in array order, then edges in array order. Timestamps are strictly
 * monotonic but synthetic.
 */
export function synthesizeFromSnapshot(
  nodes: readonly NodeSnapshot[],
  edges: readonly EdgeSnapshot[],
  reason: "seed" | "url-hash" | "template" | "user",
  now: () => number = () => performance.now(),
): ConstructionEvent[] {
  const t0 = now();
  const out: ConstructionEvent[] = [{ kind: "graph-reset", reason, at: t0 }];
  for (const [i, n] of nodes.entries()) {
    out.push({
      kind: "node-added",
      node: {
        id: n.id,
        type: n.type,
        position: { x: n.position.x, y: n.position.y },
        data: n.data,
      },
      at: t0 + i + 1,
    });
  }
  for (const [i, e] of edges.entries()) {
    const snap: EdgeSnapshot = {
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle !== undefined && e.sourceHandle !== null
        ? { sourceHandle: e.sourceHandle }
        : {}),
      ...(e.targetHandle !== undefined && e.targetHandle !== null
        ? { targetHandle: e.targetHandle }
        : {}),
    };
    out.push({ kind: "edge-added", edge: snap, at: t0 + nodes.length + i + 1 });
  }
  return out;
}
