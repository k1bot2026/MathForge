import type { BlockDefinition } from "~/blocks/types";
import type { GraphPayload, MathValue, MatrixPayload } from "~/math/types";
import { GraphError } from "../graph-theory";

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: false };

export const AdjacencyMatrixBlock: BlockDefinition = {
  id: "discrete.adjacency-matrix",
  label: "Adjacency Matrix",
  symbol: "adj",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  outputs: [
    {
      id: "A",
      label: "A",
      type: { kind: "Matrix", m: "any", n: "any", field: "integer" },
    },
  ],
  compute(inputs): MathValue {
    const gVal = inputs.G;
    if (gVal === undefined) {
      throw new GraphError("discrete.adjacency-matrix: G input is required");
    }
    const g = gVal.payload as GraphPayload;
    const n = g.vertices.length;
    const indexMap = new Map<string, number>();
    for (let i = 0; i < g.vertices.length; i++) {
      const v = g.vertices[i];
      if (v !== undefined) indexMap.set(v.id, i);
    }

    const matrix: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));

    const isUndirected = !(gVal.type as { directed?: boolean }).directed;

    for (const edge of g.edges) {
      const i = indexMap.get(edge.from);
      const j = indexMap.get(edge.to);
      if (i === undefined || j === undefined) continue;
      const w = edge.weight ?? 1;
      const row = matrix[i];
      const rowJ = matrix[j];
      if (row !== undefined) row[j] = w;
      if (isUndirected && rowJ !== undefined) rowJ[i] = w;
    }

    return {
      type: { kind: "Matrix", m: n, n, field: "integer" },
      payload: matrix as MatrixPayload,
      provenance: {
        blockId: "discrete.adjacency-matrix",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Converts a graph to its n×n adjacency matrix: A[i][j] = edge weight (or 1 for unweighted) if an edge exists, 0 otherwise.",
    why: "Bridges discrete graph theory and linear algebra — the adjacency matrix supports spectral graph analysis, matrix powers for path counting, and eigenvector centrality.",
    effect: (_inputs, output) => {
      const { m, n } = output.type as { m: number; n: number };
      return `${String(m)}×${String(n)} adjacency matrix.`;
    },
  },
};
