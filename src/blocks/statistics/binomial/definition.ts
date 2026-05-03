import type { BlockDefinition } from "~/blocks/types";
import { computeBinomial } from "./compute";

export const BinomialBlock: BlockDefinition = {
  id: "stats.binomial",
  label: "Binomial",
  symbol: "Bin(n,p)",
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
      label: "X ~ Bin(n, p)",
      type: { kind: "Distribution", family: "Binomial" },
    },
  ],
  params: {
    n: {
      kind: "integer",
      default: 10,
      min: 0,
      max: 1000,
      label: "n (number of trials)",
    },
    p: {
      kind: "number",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      label: "p (success probability)",
    },
  },
  compute: (_inputs, params) => computeBinomial(_inputs, params),
  explain: {
    what: "Defines a Binomial(n, p) distribution: counts the number of successes in n independent Bernoulli(p) trials.",
    why: "The Binomial distribution underpins quality control (defect counts), A/B testing (conversion rates), and genetics (allele frequencies). It generalises Bernoulli and converges to Normal via CLT as n→∞.",
    effect: (_inputs, output) => {
      const pl = output.payload as unknown as { moments: { mean: number; variance: number } };
      return `Output is Distribution(Binomial). E[X] = ${pl.moments.mean.toPrecision(4)}, Var[X] = ${pl.moments.variance.toPrecision(4)}.`;
    },
    impact: () =>
      "Downstream stats.sample draws integer samples in [0, n]. stats.expect returns n·p. stats.var returns n·p·(1−p).",
  },
};
