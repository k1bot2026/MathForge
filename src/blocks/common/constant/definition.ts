import type { BlockDefinition } from "~/blocks/types";
import { computeConstant } from "./compute";

export const ConstantBlock: BlockDefinition = {
  id: "core.constant",
  label: "Constant",
  symbol: "c",
  category: "source",
  domain: "common",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "value",
      label: "value",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  params: {
    value: { kind: "number", default: 0, label: "Value" },
  },
  compute: (_inputs, params) => computeConstant(params),
  explain: {
    what: "Holds a fixed real value.",
    why: "The simplest source: a number you decide on, frozen and ready to flow downstream.",
    effect: (_inputs, output) => `Outputs the scalar ${String(output.payload)}.`,
    impact: (_inputs, output) =>
      `Downstream blocks receive ${String(output.payload)} as a real, exact scalar.`,
  },
};
