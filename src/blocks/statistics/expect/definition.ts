import type { BlockDefinition } from "~/blocks/types";
import { computeExpect } from "./compute";

export const ExpectBlock: BlockDefinition = {
  id: "stats.expect",
  label: "Expected Value",
  symbol: "E[X]",
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
      id: "mean",
      label: "E[X]",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  compute: (inputs, params) => computeExpect(inputs, params),
  explain: {
    what: "Returns the expected value (mean) E[X] of a distribution.",
    why: "The expected value is the first moment of a distribution — the long-run average of a random variable. It is the fundamental summary statistic and the foundation of decision theory.",
    effect: (_inputs, output) =>
      `Output is Scalar(real). E[X] = ${(output.payload as number).toPrecision(6)}.`,
    impact: () =>
      "Use the output as a summary statistic, in loss functions, or to compare distributional locations.",
  },
};
