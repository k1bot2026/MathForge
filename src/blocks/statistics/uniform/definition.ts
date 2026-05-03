import type { BlockDefinition } from "~/blocks/types";
import { computeUniform } from "./compute";

export const UniformBlock: BlockDefinition = {
  id: "stats.uniform",
  label: "Uniform",
  symbol: "U(a,b)",
  category: "source",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "stochastic",
  inputs: [],
  outputs: [
    {
      id: "dist",
      label: "X ~ U(a, b)",
      type: { kind: "Distribution", family: "Uniform" },
    },
  ],
  params: {
    a: {
      kind: "number",
      default: 0,
      min: -1000,
      max: 999,
      step: 0.1,
      label: "a (lower bound)",
    },
    b: {
      kind: "number",
      default: 1,
      min: -999,
      max: 1000,
      step: 0.1,
      label: "b (upper bound)",
    },
  },
  compute: (_inputs, params) => computeUniform(_inputs, params),
  explain: {
    what: "Defines a continuous Uniform(a, b) distribution: every value in [a, b] is equally likely.",
    why: "The uniform distribution is the maximum-entropy distribution over a bounded interval. It models ignorance (no prior reason to prefer any value), seeds random number generators, and is the baseline against which non-uniformity is measured.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as { moments: { mean: number; variance: number } };
      return `Output is Distribution(Uniform). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Downstream stats.sample draws real-valued samples in [a, b]. stats.expect returns (a+b)/2. Skewness=0, excess kurtosis=−1.2 (platykurtic).",
  },
};
