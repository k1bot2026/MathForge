import type { BlockDefinition } from "~/blocks/types";
import { computeBeta } from "./compute";

export const BetaBlock: BlockDefinition = {
  id: "stats.beta",
  label: "Beta",
  symbol: "Beta(α,β)",
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
      label: "X ~ Beta(α, β)",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  params: {
    alpha: {
      kind: "number",
      default: 2,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "α (shape 1)",
    },
    beta: {
      kind: "number",
      default: 2,
      min: 0.001,
      max: 1000,
      step: 0.1,
      label: "β (shape 2)",
    },
  },
  compute: (_inputs, params) => computeBeta(_inputs, params),
  explain: {
    what: "Defines a Beta(α, β) distribution on [0,1] with shape parameters α and β.",
    why: "The Beta distribution is the canonical distribution for probabilities and proportions (support [0,1]). It is the conjugate prior for the Bernoulli and Binomial likelihoods — posterior of Beta(α,β) after k successes in n trials is Beta(α+k, β+n−k).",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as {
        moments: { mean: number; variance: number };
        parameters: { alpha: number; beta: number };
      };
      return `Output is Distribution(Beta). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Use as prior in stats.posterior for Beta–Bernoulli and Beta–Binomial conjugate updates. Beta(1,1) = Uniform(0,1). α=β gives symmetric shapes; α,β>1 gives unimodal; α,β<1 gives bimodal.",
  },
};
