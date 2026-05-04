import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export const InputProxyBlock: BlockDefinition = {
  id: "core.input-proxy",
  label: "Input Proxy",
  symbol: "→",
  category: "source",
  domain: "common",
  determinism: "pure",
  stability: "internal",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "value",
      label: "value",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    portId: { kind: "string", default: "", label: "Port ID" },
  },
  compute: (_inputs, _params): MathValue => {
    // In normal subgraph evaluation the sub-evaluator never calls this:
    // core.subgraph's compute() pre-populates the result map for every
    // input-proxy node before calling evaluate(). This path is only
    // reached if a proxy is placed in a top-level graph without a
    // surrounding subgraph.
    throw new Error(
      "core.input-proxy must be used inside a core.subgraph — it has no standalone value",
    );
  },
  explain: {
    what: "Internal placeholder that marks a subgraph input port. Not for direct use.",
    why: "Used by core.subgraph to forward outer input values into the inner graph.",
    effect: () => "Input proxy — value is injected by the enclosing core.subgraph.",
  },
};
