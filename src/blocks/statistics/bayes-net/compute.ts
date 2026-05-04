import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computePosterior } from "../posterior/compute";

export class BayesNetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BayesNetError";
  }
}

/**
 * Two-step sequential conjugate Bayesian update.
 *
 * Step 1: prior (Beta) + likelihood1 (Bernoulli) + n1/k1 → intermediate Beta posterior
 * Step 2: intermediate posterior + likelihood2 (Bernoulli) + n2/k2 → final Beta posterior
 *
 * Equivalent to a single Beta(α + k1 + k2, β + (n1-k1) + (n2-k2)) update, but
 * expressed as two chained stats.posterior calls to demonstrate the composable pattern.
 */
export function computeBayesNet(
  prior: MathValue,
  likelihood1: MathValue,
  likelihood2: MathValue,
  n1: number,
  k1: number,
  n2: number,
  k2: number,
): MathValue {
  if (prior.type.kind !== "Distribution") {
    throw new BayesNetError("stats.bayes-net: prior must be a Distribution");
  }
  const priorPayload = prior.payload as unknown as DistributionPayload;
  if (priorPayload.parameters.family !== "Beta") {
    throw new BayesNetError(
      `stats.bayes-net: prior must be Beta, got ${priorPayload.parameters.family}`,
    );
  }

  // Step 1: first conjugate update
  const intermediate = computePosterior(
    { prior, likelihood: likelihood1 },
    { n_obs: n1, k_hits: k1, x_obs: 0 },
  );

  // Step 2: second conjugate update using intermediate posterior as new prior
  const final = computePosterior(
    { prior: intermediate, likelihood: likelihood2 },
    { n_obs: n2, k_hits: k2, x_obs: 0 },
  );

  return final;
}
