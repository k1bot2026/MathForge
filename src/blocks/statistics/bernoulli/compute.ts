import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class BernoulliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BernoulliError";
  }
}

export function computeBernoulli(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const p = params.p as number;

  if (typeof p !== "number" || p < 0 || p > 1) {
    throw new BernoulliError(`p must be in [0, 1]; got ${String(p)}`);
  }

  const v = p * (1 - p);

  const payload: DistributionPayload = {
    parameters: { family: "Bernoulli", p },
    moments: {
      mean: p,
      variance: v,
      // Degenerate cases (p=0 or p=1) have undefined skewness/kurtosis
      skewness: v > 0 ? (1 - 2 * p) / Math.sqrt(v) : undefined,
      excessKurtosis: v > 0 ? (1 - 6 * v) / v : undefined,
    },
    support: { kind: "discrete", values: [0, 1] },
  };

  return {
    type: { kind: "Distribution", family: "Bernoulli" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.bernoulli",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
