import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class BetaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BetaError";
  }
}

export function computeBeta(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const alpha = params.alpha as number;
  const beta = params.beta as number;

  if (typeof alpha !== "number" || alpha <= 0) {
    throw new BetaError(`alpha must be > 0; got ${String(alpha)}`);
  }
  if (typeof beta !== "number" || beta <= 0) {
    throw new BetaError(`beta must be > 0; got ${String(beta)}`);
  }

  const s = alpha + beta;
  const mean = alpha / s;
  const variance = (alpha * beta) / (s * s * (s + 1));

  // Skewness: 2(β-α)·√(α+β+1) / ((α+β+2)·√(αβ))
  const skewness = (2 * (beta - alpha) * Math.sqrt(s + 1)) / ((s + 2) * Math.sqrt(alpha * beta));

  // Excess kurtosis: 6[(α-β)²(α+β+1) - αβ(α+β+2)] / [αβ(α+β+2)(α+β+3)]
  const excessKurtosis =
    (6 * ((alpha - beta) ** 2 * (s + 1) - alpha * beta * (s + 2))) /
    (alpha * beta * (s + 2) * (s + 3));

  const payload: DistributionPayload = {
    parameters: { family: "Beta", alpha, beta },
    moments: {
      mean,
      variance,
      skewness,
      excessKurtosis,
    },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };

  return {
    type: { kind: "Distribution", family: "Beta" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.beta",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
