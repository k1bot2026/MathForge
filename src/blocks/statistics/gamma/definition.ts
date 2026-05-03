import type { BlockDefinition } from "~/blocks/types";
import { computeGamma } from "./compute";

export const GammaBlock: BlockDefinition = {
  id: "stats.gamma",
  label: "Gamma",
  symbol: "Gamma(α,β)",
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
      label: "X ~ Gamma(α, β)",
      type: { kind: "Distribution", family: "Gamma" },
    },
  ],
  params: {
    alpha: {
      kind: "number",
      default: 2,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "α (shape)",
    },
    beta: {
      kind: "number",
      default: 1,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "β (rate)",
    },
  },
  compute: (_inputs, params) => computeGamma(_inputs, params),
  explain: {
    what: "Defines a Gamma(α, β) distribution (shape/rate parameterisation): a continuous distribution on [0, ∞) modelling waiting times.",
    why: "The Gamma distribution generalises the Exponential (α=1) and chi-squared (α=k/2, β=1/2) distributions. It is the conjugate prior for the Poisson rate λ. With integer α, it models the time until α events in a Poisson process.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as { moments: { mean: number; variance: number } };
      return `Output is Distribution(Gamma). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Use as prior in stats.posterior for Gamma–Poisson conjugate updates. Gamma(1, β) = Exponential(β). Downstream stats.sample draws non-negative real values.",
  },
};
