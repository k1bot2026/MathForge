import type { BlockDefinition } from "~/blocks/types";
import { computePoisson } from "./compute";

export const PoissonBlock: BlockDefinition = {
  id: "stats.poisson",
  label: "Poisson",
  symbol: "Pois(λ)",
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
      label: "X ~ Pois(λ)",
      type: { kind: "Distribution", family: "Poisson" },
    },
  ],
  params: {
    lambda: {
      kind: "number",
      default: 3,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "λ (rate)",
    },
  },
  compute: (_inputs, params) => computePoisson(_inputs, params),
  explain: {
    what: "Defines a Poisson(λ) distribution: counts rare events occurring at an average rate λ per interval.",
    why: "The Poisson distribution models radioactive decay counts, customer arrivals, insurance claims, and network packet arrivals. It is the limit of Binomial(n, λ/n) as n→∞. Equidispersion (E[X]=Var[X]=λ) is its signature property.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as { moments: { mean: number } };
      return `Output is Distribution(Poisson). E[X] = Var[X] = ${pl.moments.mean.toPrecision(4)}.`;
    },
    impact: () =>
      "Downstream stats.sample draws non-negative integer counts. Skewness > 0 (right-skewed); decreases as λ increases. Use as likelihood in stats.posterior for Gamma–Poisson conjugate Bayesian updates.",
  },
};
