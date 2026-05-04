import type { BlockDefinition } from "~/blocks/types";
import type { GraphPayload, MathValue } from "~/math/types";
import { makeScalar } from "../combinatorics";
import { GraphError, greedyColoring } from "../graph-theory";

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: false };
const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const ColoringBlock: BlockDefinition = {
  id: "discrete.coloring",
  label: "Graph Coloring",
  symbol: "χ(G)",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  outputs: [{ id: "colors", label: "chromatic number (approx.)", type: INTEGER_TYPE }],
  compute(inputs): MathValue {
    const gVal = inputs.G;
    if (gVal === undefined) {
      throw new GraphError("discrete.coloring: G input is required");
    }
    const g = gVal.payload as GraphPayload;
    const colorMap = greedyColoring(g);
    const chromatic = colorMap.size === 0 ? 0 : Math.max(...colorMap.values()) + 1;
    return makeScalar(chromatic);
  },
  explain: {
    what: "Computes an upper bound on the chromatic number χ(G) via greedy Welsh-Powell coloring (sort by degree, assign lowest unused color).",
    why: "Graph coloring models scheduling, register allocation, and map-coloring problems. Greedy gives a practical upper bound.",
    effect: (_inputs, output) => {
      const k = output.payload as number;
      return `Greedy coloring uses ${String(k)} color${k === 1 ? "" : "s"}.`;
    },
  },
};
