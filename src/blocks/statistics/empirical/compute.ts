import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class EmpiricalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmpiricalError";
  }
}

export function computeEmpirical(inputs: ResolvedInputs, _params: ResolvedParams): MathValue {
  const samplesValue = inputs.samples;
  if (samplesValue === undefined) {
    throw new EmpiricalError("samples input is required");
  }

  const samples = samplesValue.payload as ReadonlyArray<number>;
  if (samples.length === 0) {
    throw new EmpiricalError("samples must be non-empty");
  }

  const n = samples.length;
  const mean = samples.reduce((s, x) => s + x, 0) / n;
  const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / n;

  // Skewness and excess kurtosis from standardised moments
  let skewness: number | undefined;
  let excessKurtosis: number | undefined;
  const sigma = Math.sqrt(variance);
  if (sigma > 0) {
    skewness = samples.reduce((s, x) => s + ((x - mean) / sigma) ** 3, 0) / n;
    excessKurtosis = samples.reduce((s, x) => s + ((x - mean) / sigma) ** 4, 0) / n - 3;
  }

  const payload: DistributionPayload = {
    parameters: { family: "Empirical", samples },
    moments: { mean, variance, skewness, excessKurtosis },
    support: { kind: "discrete", values: samples },
  };

  return {
    type: { kind: "Distribution", family: "Empirical" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.empirical",
      inputs: [samplesValue.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
