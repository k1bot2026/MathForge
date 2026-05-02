// Adapter between React Flow's Node/Edge shape and the evaluator's
// internal GraphSpec.
//
// React Flow nodes are visual records that carry per-block runtime data
// in `node.data`. The evaluator only needs (id, blockId, params) per
// node and (id, source, target, ports) per edge; this module is the
// only place that knows how to bridge the two.

import type { Edge, Node } from "@xyflow/react";
import type { ResolvedParams } from "~/blocks/types";

export type NodeSpec = {
  id: string;
  /** The BlockDefinition id this node instantiates. */
  blockId: string;
  params: ResolvedParams;
};

export type EdgeSpec = {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
};

export type GraphSpec = {
  nodes: ReadonlyArray<NodeSpec>;
  edges: ReadonlyArray<EdgeSpec>;
};

/** Per-node `data` shape we expect from the graph store. */
export type BlockNodeData = {
  blockId: string;
  params?: ResolvedParams;
};

export function toGraphSpec(nodes: ReadonlyArray<Node>, edges: ReadonlyArray<Edge>): GraphSpec {
  return {
    nodes: nodes.map((n) => {
      const data = (n.data ?? {}) as Partial<BlockNodeData>;
      return {
        id: n.id,
        blockId: data.blockId ?? n.type ?? "unknown",
        params: data.params ?? {},
      };
    }),
    edges: edges.map((e) => {
      const spec: EdgeSpec = {
        id: e.id,
        source: e.source,
        target: e.target,
      };
      if (e.sourceHandle != null) spec.sourcePort = e.sourceHandle;
      if (e.targetHandle != null) spec.targetPort = e.targetHandle;
      return spec;
    }),
  };
}
