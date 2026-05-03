import type { BlockDefinition } from "~/blocks/types";
import { computeNormal } from "./compute";

export const NormalBlock: BlockDefinition = {
  id: "stats.normal",
  label: "Normal",
  symbol: "N(μ,σ²)",
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
      label: "X ~ N(μ, σ²)",
      type: { kind: "Distribution", family: "Normal" },
    },
  ],
  params: {
    mu: {
      kind: "number",
      default: 0,
      min: -1000,
      max: 1000,
      step: 0.1,
      label: "μ (mean)",
    },
    sigma: {
      kind: "number",
      default: 1,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "σ (std dev)",
    },
  },
  compute: (_inputs, params) => computeNormal(_inputs, params),
  explain: {
    what: "Defines a Normal(μ, σ²) distribution with mean μ and standard deviation σ.",
    why: "The Normal distribution is the central object of classical statistics. The Central Limit Theorem guarantees that sums of i.i.d. random variables converge to it. It models measurement error, natural variation, and is the conjugate prior for known-variance likelihoods.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as {
        moments: { mean: number; variance: number };
        parameters: { mu: number; sigma: number };
      };
      return `Output is Distribution(Normal). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)} (σ = ${pl.parameters.sigma.toPrecision(4)}).`;
    },
    impact: () =>
      "Downstream stats.sample draws real-valued samples. Skewness=0, excess kurtosis=0 (mesokurtic). Use as prior for stats.posterior in Normal–Normal conjugate updates.",
  },
};
