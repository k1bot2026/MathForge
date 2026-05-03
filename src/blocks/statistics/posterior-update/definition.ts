import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { BetaParameters, DistributionPayload } from "../distribution-payload";
import { PosteriorUpdateVisualization } from "./visualization";

export class PosteriorUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosteriorUpdateError";
  }
}

export const PosteriorUpdateBlock: BlockDefinition = {
  id: "viz.posterior-update",
  label: "Posterior Update",
  symbol: "P(θ|x)",
  category: "visualizer",
  domain: "statistics",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "stochastic",
  inputs: [
    {
      id: "prior",
      label: "Prior (Beta)",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  outputs: [
    {
      id: "posterior",
      label: "Posterior (Beta)",
      type: { kind: "Distribution", family: "Beta" },
    },
  ],
  params: {
    n_obs: {
      kind: "integer",
      default: 10,
      min: 0,
      max: 1000,
      label: "Observations (n)",
    },
    k_hits: {
      kind: "integer",
      default: 7,
      min: 0,
      max: 1000,
      label: "Successes (k)",
    },
  },
  compute: (inputs, params): MathValue => {
    const prior = inputs.prior;
    if (prior === undefined) {
      throw new PosteriorUpdateError(
        "viz.posterior-update requires a Beta Distribution on port prior",
      );
    }
    const payload = prior.payload as unknown as DistributionPayload;
    if (payload.parameters.family !== "Beta") {
      throw new PosteriorUpdateError(
        "viz.posterior-update requires a Beta prior for conjugate updating",
      );
    }

    const { alpha, beta } = payload.parameters as BetaParameters & { family: "Beta" };
    const n = typeof params.n_obs === "number" ? Math.round(Math.max(0, params.n_obs)) : 0;
    const k =
      typeof params.k_hits === "number" ? Math.round(Math.max(0, Math.min(n, params.k_hits))) : 0;

    const postAlpha = alpha + k;
    const postBeta = beta + (n - k);
    const mean = postAlpha / (postAlpha + postBeta);
    const variance =
      (postAlpha * postBeta) / ((postAlpha + postBeta) ** 2 * (postAlpha + postBeta + 1));

    const postPayload: DistributionPayload = {
      parameters: { family: "Beta", alpha: postAlpha, beta: postBeta },
      moments: { mean, variance },
      support: { kind: "continuous", lo: 0, hi: 1 },
    };

    return {
      type: { kind: "Distribution", family: "Beta" },
      payload: postPayload as unknown as number,
      provenance: {
        blockId: "viz.posterior-update",
        inputs: [prior.provenance.blockId],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Applies a Beta-Bernoulli conjugate update: given a Beta(α,β) prior and k successes in n Bernoulli trials, the posterior is Beta(α+k, β+n−k). Use the n_obs and k_hits sliders to explore.",
    why: "The Beta-Bernoulli model is the canonical Bayesian inference example. It has a closed-form posterior, making it ideal for building intuition about how evidence updates beliefs.",
    effect: (inputs, output) => {
      if (inputs.prior === undefined) return "Connect a Beta prior.";
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family !== "Beta") return "Non-Beta posterior.";
      const { alpha, beta } = p.parameters;
      const mean = alpha / (alpha + beta);
      return `Posterior: Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}). E[θ] = ${mean.toPrecision(4)}.`;
    },
    impact: (_inputs, output) => {
      const p = output.payload as unknown as DistributionPayload;
      if (p.parameters.family !== "Beta") return "Outputs a Beta Distribution.";
      const { alpha, beta } = p.parameters;
      return `Outputs Beta(${alpha.toPrecision(4)}, ${beta.toPrecision(4)}) — connect to viz.pdf-cdf for a detailed view.`;
    },
  },
  visualization: PosteriorUpdateVisualization,
};
