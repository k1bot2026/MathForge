import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class PoissonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PoissonError";
  }
}

export function computePoisson(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const lambda = params.lambda as number;

  if (typeof lambda !== "number" || lambda <= 0) {
    throw new PoissonError(`lambda must be > 0; got ${String(lambda)}`);
  }

  // Truncate support at mean + 6·σ; captures > 99.9999998% of probability mass.
  const upperTrunc = Math.ceil(lambda + 6 * Math.sqrt(lambda));
  const support = Array.from({ length: upperTrunc + 1 }, (_, k) => k);

  const payload: DistributionPayload = {
    parameters: { family: "Poisson", lambda },
    moments: {
      mean: lambda,
      variance: lambda,
      skewness: 1 / Math.sqrt(lambda),
      excessKurtosis: 1 / lambda,
    },
    support: { kind: "discrete", values: support },
  };

  return {
    type: { kind: "Distribution", family: "Poisson" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.poisson",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
