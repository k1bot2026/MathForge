import type { BlockDefinition } from "~/blocks/types";
import { computeEmpirical } from "./compute";

export const EmpiricalBlock: BlockDefinition = {
  id: "stats.empirical",
  label: "Empirical Distribution",
  symbol: "Emp(X)",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "stochastic",
  inputs: [
    {
      id: "samples",
      label: "samples",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "dist",
      label: "Empirical(X)",
      type: { kind: "Distribution", family: "Empirical" },
    },
  ],
  compute: (inputs, params) => computeEmpirical(inputs, params),
  explain: {
    what: "Wraps a sample array as an empirical distribution, computing the sample mean and variance.",
    why: "The empirical distribution is the data-driven counterpart to parametric distributions. It carries no assumption about the underlying family, making it ideal for non-parametric statistics and as input to stats.expect and stats.var.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as {
        moments: { mean: number; variance: number };
        parameters: { samples: ReadonlyArray<number> };
      };
      return `Output is Distribution(Empirical) over ${pl.parameters.samples.length} samples. E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Connect to viz.histogram for visual inspection. stats.expect returns the sample mean; stats.var returns the population variance (divided by n, not n−1).",
  },
};
