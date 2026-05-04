import type { BlockDefinition } from "~/blocks/types";
import type { DistributionPayload } from "../distribution-payload";
import { BayesNetError, computeBayesNet } from "./compute";

const betaDist = { kind: "Distribution", family: "Beta" } as const;
const bernoulliDist = { kind: "Distribution", family: "Bernoulli" } as const;

export const BayesNetBlock: BlockDefinition = {
  id: "stats.bayes-net",
  label: "Bayes Net",
  symbol: "𝔹",
  category: "composite",
  domain: "statistics",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "stochastic",
  inputs: [
    { id: "prior", label: "Prior (Beta)", type: betaDist },
    { id: "likelihood1", label: "Likelihood 1 (Bernoulli)", type: bernoulliDist },
    { id: "likelihood2", label: "Likelihood 2 (Bernoulli)", type: bernoulliDist },
  ],
  outputs: [{ id: "posterior", label: "Posterior (Beta)", type: betaDist }],
  params: {
    n1: { kind: "integer", default: 10, min: 0, max: 100000, label: "Observations 1 (n₁)" },
    k1: { kind: "integer", default: 7, min: 0, max: 100000, label: "Successes 1 (k₁)" },
    n2: { kind: "integer", default: 10, min: 0, max: 100000, label: "Observations 2 (n₂)" },
    k2: { kind: "integer", default: 5, min: 0, max: 100000, label: "Successes 2 (k₂)" },
  },
  compute(inputs, params) {
    const { prior, likelihood1, likelihood2 } = inputs;
    if (prior === undefined || likelihood1 === undefined || likelihood2 === undefined) {
      throw new BayesNetError(
        "stats.bayes-net requires prior, likelihood1, and likelihood2 inputs",
      );
    }
    const n1 = typeof params.n1 === "number" ? Math.round(Math.max(0, params.n1)) : 10;
    const k1 = typeof params.k1 === "number" ? Math.round(Math.max(0, params.k1)) : 7;
    const n2 = typeof params.n2 === "number" ? Math.round(Math.max(0, params.n2)) : 10;
    const k2 = typeof params.k2 === "number" ? Math.round(Math.max(0, params.k2)) : 5;

    return computeBayesNet(prior, likelihood1, likelihood2, n1, k1, n2, k2);
  },
  explain: {
    what: "Two-step sequential Bayesian update: Beta prior updated by two independent Bernoulli data sources. Equivalent to chaining two stats.posterior blocks.",
    why: "Models belief updating from multiple evidence sources in sequence. Conjugate Beta–Bernoulli pairs give exact closed-form posteriors at each step.",
    effect: (inputs, output) => {
      if (inputs.prior === undefined) return "Connect prior and both likelihood distributions.";
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family === "Beta") {
        const { alpha, beta } = p.parameters;
        return `Posterior: Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}). E[θ] = ${(alpha / (alpha + beta)).toPrecision(4)}.`;
      }
      return "Posterior computed.";
    },
    impact: (_inputs, output) => {
      const p = output.payload as unknown as DistributionPayload;
      return `Outputs ${p.parameters.family} Distribution after two-step update. Connect to viz.pdf-cdf or viz.posterior-update.`;
    },
  },
};
