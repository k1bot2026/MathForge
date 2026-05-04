import type { BlockDefinition } from "~/blocks/types";
import type { GraphPayload, MathValue } from "~/math/types";
import { makeScalar } from "../combinatorics";
import { connectedComponents, GraphError } from "../graph-theory";

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: false };
const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const ConnectedComponentsBlock: BlockDefinition = {
  id: "discrete.connected-components",
  label: "Connected Components",
  symbol: "CC",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  outputs: [
    {
      id: "count",
      label: "component count",
      type: INTEGER_TYPE,
    },
  ],
  compute(inputs): MathValue {
    const gVal = inputs.G;
    if (gVal === undefined) {
      throw new GraphError("discrete.connected-components: G input is required");
    }
    const g = gVal.payload as GraphPayload;
    const components = connectedComponents(g);
    return makeScalar(components.length);
  },
  explain: {
    what: "Counts the number of connected components in an undirected graph using BFS.",
    why: "A graph is connected iff it has exactly 1 component. Component count drives clustering, reachability, and network-partition analysis.",
    effect: (_inputs, output) => {
      const count = output.payload as number;
      return `${String(count)} connected component${count === 1 ? "" : "s"}.`;
    },
  },
};
