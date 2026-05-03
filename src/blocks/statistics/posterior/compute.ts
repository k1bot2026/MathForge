import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class PosteriorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PosteriorError";
  }
}

export function computePosterior(inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const prior = inputs.prior;
  const likelihood = inputs.likelihood;
  if (prior === undefined || likelihood === undefined) {
    throw new PosteriorError("stats.posterior requires prior and likelihood inputs");
  }
  if (prior.type.kind !== "Distribution" || likelihood.type.kind !== "Distribution") {
    throw new PosteriorError("Both prior and likelihood must be Distribution values");
  }

  const priorPayload = prior.payload as unknown as DistributionPayload;
  const likPayload = likelihood.payload as unknown as DistributionPayload;
  const n_obs = typeof params.n_obs === "number" ? Math.round(Math.max(0, params.n_obs)) : 1;
  // k_hits_bounded: successes in [0, n_obs] — for Bernoulli/Binomial where k ≤ n
  // k_events: raw non-negative integer — for Gamma-Poisson where total events can exceed periods
  const rawK = typeof params.k_hits === "number" ? Math.round(Math.max(0, params.k_hits)) : 0;
  const k_hits = Math.min(n_obs, rawK);
  const k_events = rawK;

  // ── Beta–Bernoulli ──────────────────────────────────────────────────────────
  // Prior: Beta(α,β) + Bernoulli evidence (k successes in n trials)
  // Posterior: Beta(α+k, β+n−k)
  if (priorPayload.parameters.family === "Beta" && likPayload.parameters.family === "Bernoulli") {
    const { alpha, beta } = priorPayload.parameters;
    const postAlpha = alpha + k_hits;
    const postBeta = beta + (n_obs - k_hits);
    return makeBetaPosterior(postAlpha, postBeta, prior.provenance.blockId);
  }

  // ── Beta–Binomial ───────────────────────────────────────────────────────────
  // Prior: Beta(α,β) + Binomial likelihood with k_hits successes in n_obs trials
  // Posterior: Beta(α+k, β+n−k)
  if (priorPayload.parameters.family === "Beta" && likPayload.parameters.family === "Binomial") {
    const { alpha, beta } = priorPayload.parameters;
    const postAlpha = alpha + k_hits;
    const postBeta = beta + (n_obs - k_hits);
    return makeBetaPosterior(postAlpha, postBeta, prior.provenance.blockId);
  }

  // ── Normal–Normal (known likelihood σ) ─────────────────────────────────────
  // Prior: Normal(μ₀, σ₀²) + Normal(μ_lik, σ_lik²) likelihood + x_obs observation
  // Posterior: Normal(μ_post, σ_post²)
  //   σ_post² = 1/(1/σ₀² + n/σ_lik²)
  //   μ_post = σ_post² * (μ₀/σ₀² + n*x̄/σ_lik²)
  if (priorPayload.parameters.family === "Normal" && likPayload.parameters.family === "Normal") {
    const { mu: mu0, sigma: sigma0 } = priorPayload.parameters;
    const { sigma: sigmaLik } = likPayload.parameters;
    const x_obs = typeof params.x_obs === "number" ? params.x_obs : 0;
    const n = n_obs;

    const var0 = sigma0 ** 2;
    const varLik = sigmaLik ** 2;
    const varPost = 1 / (1 / var0 + n / varLik);
    const muPost = varPost * (mu0 / var0 + (n * x_obs) / varLik);
    const sigmaPost = Math.sqrt(varPost);

    const mean = muPost;
    const variance = varPost;
    const postPayload: DistributionPayload = {
      parameters: { family: "Normal", mu: muPost, sigma: sigmaPost },
      moments: { mean, variance, skewness: 0, excessKurtosis: 0 },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    };
    return {
      type: { kind: "Distribution", family: "Normal" },
      payload: postPayload as unknown as number,
      provenance: {
        blockId: "stats.posterior",
        inputs: [prior.provenance.blockId, likelihood.provenance.blockId],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  }

  // ── Gamma–Poisson ───────────────────────────────────────────────────────────
  // Prior: Gamma(α,β) + Poisson(λ) likelihood + k_hits observations summing to k
  // Posterior: Gamma(α+k, β+n)
  if (priorPayload.parameters.family === "Gamma" && likPayload.parameters.family === "Poisson") {
    const { alpha, beta } = priorPayload.parameters;
    const postAlpha = alpha + k_events;
    const postBeta = beta + n_obs;
    const mean = postAlpha / postBeta;
    const variance = postAlpha / postBeta ** 2;
    const postPayload: DistributionPayload = {
      parameters: { family: "Gamma", alpha: postAlpha, beta: postBeta },
      moments: {
        mean,
        variance,
        skewness: 2 / Math.sqrt(postAlpha),
        excessKurtosis: 6 / postAlpha,
      },
      support: { kind: "continuous", lo: 0, hi: Infinity },
    };
    return {
      type: { kind: "Distribution", family: "Gamma" },
      payload: postPayload as unknown as number,
      provenance: {
        blockId: "stats.posterior",
        inputs: [prior.provenance.blockId, likelihood.provenance.blockId],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  }

  throw new PosteriorError(
    `Non-conjugate posterior: ${priorPayload.parameters.family} prior + ${likPayload.parameters.family} likelihood. Numerical / SymPy fallback not yet implemented.`,
  );
}

function makeBetaPosterior(alpha: number, beta: number, priorBlockId: string): MathValue {
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const postPayload: DistributionPayload = {
    parameters: { family: "Beta", alpha, beta },
    moments: { mean, variance },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };
  return {
    type: { kind: "Distribution", family: "Beta" },
    payload: postPayload as unknown as number,
    provenance: {
      blockId: "stats.posterior",
      inputs: [priorBlockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
