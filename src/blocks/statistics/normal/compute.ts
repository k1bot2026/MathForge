import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class NormalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalError";
  }
}

export function computeNormal(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const mu = params.mu as number;
  const sigma = params.sigma as number;

  if (typeof sigma !== "number" || sigma <= 0) {
    throw new NormalError(`sigma must be > 0; got ${String(sigma)}`);
  }

  const payload: DistributionPayload = {
    parameters: { family: "Normal", mu, sigma },
    moments: {
      mean: mu,
      variance: sigma ** 2,
      skewness: 0,
      excessKurtosis: 0,
    },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  };

  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.normal",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
