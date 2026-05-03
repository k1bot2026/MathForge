import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class GammaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GammaError";
  }
}

// Shape (α) / rate (β) parameterisation: mean = α/β, var = α/β².
export function computeGamma(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const alpha = params.alpha as number;
  const beta = params.beta as number;

  if (typeof alpha !== "number" || alpha <= 0) {
    throw new GammaError(`alpha must be > 0; got ${String(alpha)}`);
  }
  if (typeof beta !== "number" || beta <= 0) {
    throw new GammaError(`beta must be > 0; got ${String(beta)}`);
  }

  // Upper bound for display: mean + 6·σ (captures virtually all mass)
  const mean = alpha / beta;
  const variance = alpha / beta ** 2;
  const hi = mean + 6 * Math.sqrt(variance);

  const payload: DistributionPayload = {
    parameters: { family: "Gamma", alpha, beta },
    moments: {
      mean,
      variance,
      skewness: 2 / Math.sqrt(alpha),
      excessKurtosis: 6 / alpha,
    },
    support: { kind: "continuous", lo: 0, hi: hi },
  };

  return {
    type: { kind: "Distribution", family: "Gamma" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.gamma",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
