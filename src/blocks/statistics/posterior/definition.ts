import type { BlockDefinition } from "~/blocks/types";
import type { DistributionPayload } from "../distribution-payload";
import { computePosterior } from "./compute";

export const PosteriorBlock: BlockDefinition = {
  id: "stats.posterior",
  label: "Posterior",
  symbol: "P(θ|x)",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "stochastic",
  inputs: [
    {
      id: "prior",
      label: "Prior",
      type: { kind: "Distribution", family: "Beta" },
    },
    {
      id: "likelihood",
      label: "Likelihood",
      type: { kind: "Distribution", family: "Bernoulli" },
    },
  ],
  outputs: [
    {
      id: "posterior",
      label: "Posterior",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  params: {
    n_obs: {
      kind: "integer",
      default: 10,
      min: 0,
      max: 10000,
      label: "Observations (n)",
    },
    k_hits: {
      kind: "integer",
      default: 7,
      min: 0,
      max: 10000,
      label: "Successes / sum (k)",
    },
    x_obs: {
      kind: "number",
      default: 0,
      label: "Observed value (Normal–Normal only)",
    },
  },
  compute: (inputs, params) => computePosterior(inputs, params),
  explain: {
    what: "Applies a conjugate Bayesian update: prior + likelihood evidence → posterior. Supported pairs: Beta–Bernoulli, Beta–Binomial, Normal–Normal (known σ), Gamma–Poisson.",
    why: "Conjugate priors have closed-form posteriors, making Bayesian inference exact and fast. The posterior is itself a distribution of the same family as the prior, ready to chain into further operations.",
    effect: (inputs, output) => {
      if (inputs.prior === undefined) return "Connect prior and likelihood distributions.";
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family === "Beta") {
        const { alpha, beta } = p.parameters;
        return `Posterior: Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}). E[θ] = ${(alpha / (alpha + beta)).toPrecision(4)}.`;
      }
      if (p.parameters.family === "Normal") {
        const { mu, sigma } = p.parameters;
        return `Posterior: Normal(μ=${mu.toPrecision(4)}, σ=${sigma.toPrecision(4)}).`;
      }
      if (p.parameters.family === "Gamma") {
        const { alpha, beta } = p.parameters;
        return `Posterior: Gamma(α=${alpha.toPrecision(4)}, β=${beta.toPrecision(4)}). E[λ] = ${(alpha / beta).toPrecision(4)}.`;
      }
      return "Posterior computed.";
    },
    impact: (_inputs, output) => {
      const p = output.payload as unknown as DistributionPayload;
      return `Outputs ${p.parameters.family} Distribution. Connect to viz.pdf-cdf or viz.posterior-update for visualization.`;
    },
  },
};
