import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class UniformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UniformError";
  }
}

export function computeUniform(_inputs: ResolvedInputs, params: ResolvedParams): MathValue {
  const a = params.a as number;
  const b = params.b as number;

  if (typeof a !== "number" || typeof b !== "number" || a >= b) {
    throw new UniformError(`a must be strictly less than b; got a=${String(a)}, b=${String(b)}`);
  }

  const width = b - a;
  const payload: DistributionPayload = {
    parameters: { family: "Uniform", a, b },
    moments: {
      mean: (a + b) / 2,
      variance: width ** 2 / 12,
      skewness: 0,
      excessKurtosis: -1.2,
    },
    support: { kind: "continuous", lo: a, hi: b },
  };

  return {
    type: { kind: "Distribution", family: "Uniform" },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.uniform",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
