import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class CorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorError";
  }
}

type PayloadWithMoments = { moments: { variance: number } };

export function computeCor(inputs: ResolvedInputs, _params: ResolvedParams): MathValue {
  const covValue = inputs.cov;
  const X = inputs.X;
  const Y = inputs.Y;
  if (covValue === undefined || X === undefined || Y === undefined) {
    throw new CorError("cov, X, and Y inputs are required");
  }

  const cov = covValue.payload as number;
  const varX = (X.payload as unknown as PayloadWithMoments).moments.variance;
  const varY = (Y.payload as unknown as PayloadWithMoments).moments.variance;

  const denom = Math.sqrt(varX * varY);
  const cor = denom < 1e-15 ? 0 : cov / denom;

  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: Math.max(-1, Math.min(1, cor)),
    provenance: {
      blockId: "stats.cor",
      inputs: [covValue.provenance.blockId, X.provenance.blockId, Y.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
