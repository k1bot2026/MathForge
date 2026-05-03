import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class VarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VarError";
  }
}

export function computeVar(inputs: ResolvedInputs, _params: ResolvedParams): MathValue {
  const distValue = inputs.dist;
  if (distValue === undefined) {
    throw new VarError("dist input is required");
  }

  const payload = distValue.payload as unknown as DistributionPayload;

  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: payload.moments.variance,
    provenance: {
      blockId: "stats.var",
      inputs: [distValue.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
