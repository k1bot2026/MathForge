import type { BlockDefinition } from "~/blocks/types";
import { computeSample } from "./compute";

export const SampleBlock: BlockDefinition = {
  id: "stats.sample",
  label: "Sample",
  symbol: "sample(X, n)",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "stochastic",
  inputs: [
    {
      id: "dist",
      label: "distribution",
      type: { kind: "Distribution", family: "Empirical" },
    },
  ],
  outputs: [
    {
      id: "samples",
      label: "samples",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {
    n: {
      kind: "integer",
      default: 100,
      min: 1,
      max: 100000,
      label: "n (number of samples)",
    },
    seed: {
      kind: "integer",
      default: 42,
      min: 0,
      max: 2147483647,
      label: "seed (reproducibility)",
    },
  },
  compute: (inputs, params) => computeSample(inputs, params),
  explain: {
    what: "Draws n independent samples from a distribution using a seeded PCG32 PRNG for reproducibility.",
    why: "Monte Carlo methods, bootstrap confidence intervals, posterior predictive checks, and simulation-based inference all require sampling. Seeded generation ensures reproducible results for educational use.",
    effect: (_inputs, output) => {
      const samples = output.payload as number[];
      return `Output is Vector<${samples.length}, real> of samples.`;
    },
    impact: () =>
      "Connect to viz.histogram to visualise the sample distribution. Feed into stats.empirical to compute empirical moments. Seeded with the same seed, produces identical results.",
  },
};
