import type { BlockDefinition } from "~/blocks/types";
import { computeVar } from "./compute";

export const VarBlock: BlockDefinition = {
  id: "stats.var",
  label: "Variance",
  symbol: "Var[X]",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "dist",
      label: "distribution",
      type: { kind: "Distribution", family: "Empirical" },
    },
  ],
  outputs: [
    {
      id: "variance",
      label: "Var[X]",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  compute: (inputs, params) => computeVar(inputs, params),
  explain: {
    what: "Returns the variance Var[X] = E[(X − E[X])²] of a distribution.",
    why: "Variance measures the spread of a distribution around its mean. It is the second central moment and the square of the standard deviation.",
    effect: (_inputs, output) =>
      `Output is Scalar(real). Var[X] = ${(output.payload as number).toPrecision(6)}.`,
    impact: () =>
      "Use the output to compute standard deviation (√Var[X]), z-scores, or as input to stats.cor.",
  },
};
