import type { BlockDefinition } from "~/blocks/types";
import { computeBernoulli } from "./compute";

export const BernoulliBlock: BlockDefinition = {
  id: "stats.bernoulli",
  label: "Bernoulli",
  symbol: "Bernoulli(p)",
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
      label: "X ~ Bernoulli(p)",
      type: { kind: "Distribution", family: "Bernoulli" },
    },
  ],
  params: {
    p: {
      kind: "number",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      label: "p (success probability)",
    },
  },
  compute: (_inputs, params) => computeBernoulli(_inputs, params),
  explain: {
    what: "Defines a Bernoulli(p) distribution: a single trial that succeeds (X=1) with probability p and fails (X=0) with probability 1−p.",
    why: "The Bernoulli distribution is the atomic building block of probability theory. It models any binary outcome — coin flips, clicks, disease presence — and is the foundation of the Binomial, Geometric, and Negative Binomial distributions.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as { moments: { mean: number; variance: number } };
      return `Output is Distribution(Bernoulli). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Downstream stats.sample draws 0/1 samples. stats.expect returns p. stats.var returns p(1-p). Connect to stats.posterior as a prior for Bayesian inference.",
  },
};
