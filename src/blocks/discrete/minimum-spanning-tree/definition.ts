import type { BlockDefinition } from "~/blocks/types";
import type { GraphEdgeSpec, GraphPayload, GraphVertex, MathValue } from "~/math/types";
import { GraphError, kruskal, makeGraph } from "../graph-theory";

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: true };

export const MinimumSpanningTreeBlock: BlockDefinition = {
  id: "discrete.minimum-spanning-tree",
  label: "Minimum Spanning Tree",
  symbol: "MST",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  outputs: [{ id: "T", label: "T (MST)", type: GRAPH_TYPE }],
  compute(inputs): MathValue {
    const gVal = inputs.G;
    if (gVal === undefined) {
      throw new GraphError("discrete.minimum-spanning-tree: G input is required");
    }
    const g = gVal.payload as GraphPayload;
    const mstEdges = kruskal(g);
    return makeGraph(g.vertices as GraphVertex[], mstEdges as GraphEdgeSpec[], false, true);
  },
  explain: {
    what: "Computes the minimum spanning tree of an undirected weighted graph using Kruskal's algorithm.",
    why: "MST minimizes total edge weight while keeping the graph connected — used in network design, clustering, and approximation algorithms.",
    effect: (_inputs, output) => {
      const { vertices, edges } = output.payload as GraphPayload;
      const total = edges.reduce((sum, e) => sum + (e.weight ?? 1), 0);
      return `MST: ${String(vertices.length)} vertices, ${String(edges.length)} edges, total weight = ${String(total)}.`;
    },
  },
};
