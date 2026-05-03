import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class CovError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CovError";
  }
}

// Independence assumption: Cov[X, Y] = 0 for unrelated distributions.
// For the same random variable (same provenance), Cov[X, X] = Var[X].
// Joint distribution support is a Phase-3 stretch goal.
export function computeCov(inputs: ResolvedInputs, _params: ResolvedParams): MathValue {
  const X = inputs.X;
  const Y = inputs.Y;
  if (X === undefined || Y === undefined) {
    throw new CovError("X and Y distribution inputs are required");
  }

  type PayloadWithMoments = { moments: { variance: number } };
  const xPayload = X.payload as unknown as PayloadWithMoments;

  // Same random variable: Cov[X, X] = Var[X]
  const cov =
    X.provenance.blockId === Y.provenance.blockId &&
    X.provenance.computedAt === Y.provenance.computedAt
      ? xPayload.moments.variance
      : 0;

  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: cov,
    provenance: {
      blockId: "stats.cov",
      inputs: [X.provenance.blockId, Y.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
