import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class BinomialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinomialError";
  }
}

export function computeBinomial(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const n = params.n as number;
  const p = params.p as number;

  if (!Number.isInteger(n) || n < 0) {
    throw new BinomialError(`n must be a non-negative integer; got ${String(n)}`);
  }
  if (typeof p !== "number" || p < 0 || p > 1) {
    throw new BinomialError(`p must be in [0, 1]; got ${String(p)}`);
  }

  const mean = n * p;
  const v = n * p * (1 - p);

  const support = Array.from({ length: n + 1 }, (_, k) => k);

  const payload: DistributionPayload = {
    parameters: { family: "Binomial", n, p },
    moments: {
      mean,
      variance: v,
      skewness: v > 0 ? (1 - 2 * p) / Math.sqrt(v) : undefined,
      excessKurtosis: v > 0 ? (1 - 6 * p * (1 - p)) / v : undefined,
    },
    support: { kind: "discrete", values: support },
  };

  return {
    type: { kind: "Distribution", family: "Binomial" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.binomial",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
