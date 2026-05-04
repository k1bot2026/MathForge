import type { BlockDefinition } from "~/blocks/types";
import type { GraphPayload, MathValue, SetPayload } from "~/math/types";
import { makeScalar } from "../combinatorics";
import { dijkstra, GraphError } from "../graph-theory";

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: true };
const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};
const SET_INTEGER_TYPE = { kind: "Set" as const, element: INTEGER_TYPE };

export const ShortestPathBlock: BlockDefinition = {
  id: "discrete.shortest-path",
  label: "Shortest Path",
  symbol: "sp",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  outputs: [
    {
      id: "distances",
      label: "distances from source",
      type: SET_INTEGER_TYPE,
    },
  ],
  params: {
    source: { kind: "integer", default: 0, min: 0, max: 9999, label: "Source vertex" },
  },
  compute(inputs, params): MathValue {
    const gVal = inputs.G;
    if (gVal === undefined) {
      throw new GraphError("discrete.shortest-path: G input is required");
    }
    const g = gVal.payload as GraphPayload;
    const sourceId = String(typeof params.source === "number" ? params.source : 0);

    if (!g.vertices.some((v) => v.id === sourceId)) {
      throw new GraphError(`discrete.shortest-path: source vertex '${sourceId}' not in graph`);
    }

    const distMap = dijkstra(g, sourceId);

    // Output as Set of scalar distances in vertex order
    const distValues: SetPayload = g.vertices.map((v) => {
      const d = distMap.get(v.id) ?? Infinity;
      return makeScalar(Number.isFinite(d) ? d : -1);
    });

    return {
      type: SET_INTEGER_TYPE,
      payload: distValues,
      provenance: {
        blockId: "discrete.shortest-path",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes shortest-path distances from a source vertex to all other vertices using Dijkstra's algorithm. Unreachable vertices get distance -1.",
    why: "Used in routing, network analysis, and graph distance computations. Efficient for non-negative edge weights.",
    effect: (_inputs, output) => {
      const dists = (output.payload as SetPayload).map((v) => v.payload as number);
      const reachable = dists.filter((d) => d >= 0).length;
      return `${String(reachable)} vertices reachable from source.`;
    },
  },
};
