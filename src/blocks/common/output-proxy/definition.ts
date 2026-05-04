import type { BlockDefinition } from "~/blocks/types";

export const OutputProxyBlock: BlockDefinition = {
  id: "core.output-proxy",
  label: "Output Proxy",
  symbol: "←",
  category: "sink",
  domain: "common",
  determinism: "pure",
  stability: "internal",
  engine: "native",
  color: "source",
  inputs: [
    {
      id: "value",
      label: "value",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  outputs: [],
  params: {
    portId: { kind: "string", default: "", label: "Port ID" },
  },
  compute: (inputs) => {
    const v = inputs.value;
    if (v === undefined) {
      throw new Error("core.output-proxy: no value connected");
    }
    return v;
  },
  explain: {
    what: "Internal placeholder that marks a subgraph output port. Not for direct use.",
    why: "Used by core.subgraph to read inner graph results and expose them as named output ports.",
    effect: (_inputs, output) =>
      `Output proxy — forwards ${String(output)} to enclosing core.subgraph.`,
  },
};
