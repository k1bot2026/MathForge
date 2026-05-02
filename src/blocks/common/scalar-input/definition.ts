import type { BlockDefinition } from "~/blocks/types";
import { computeScalarInput } from "./compute";

export const ScalarInputBlock: BlockDefinition = {
  id: "core.scalar-input",
  label: "Scalar input",
  symbol: "x",
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
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    value: { kind: "number", default: 1, label: "Value" },
    min: { kind: "number", default: -10, label: "Min" },
    max: { kind: "number", default: 10, label: "Max" },
    step: { kind: "number", default: 0.1, label: "Step" },
  },
  compute: (_inputs, params) => computeScalarInput(params),
  explain: {
    what: "An interactive scalar — a number you can scrub in the inspector.",
    why: "Lets you watch the rest of the graph respond to a single value live.",
    effect: (_inputs, output) => `Currently ${String(output.payload)}.`,
    impact: (_inputs, output) =>
      `Downstream blocks see this as an approximate real scalar (${String(output.payload)}).`,
  },
};
