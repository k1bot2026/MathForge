import { computeRref } from "~/blocks/linear-algebra/rref/compute";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class RankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RankError";
  }
}

const EPS = 1e-9;

export function computeRank(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new RankError("rank requires input A");
  }
  const rref = computeRref(inputs);
  const rows = rref.payload as ReadonlyArray<ReadonlyArray<number>>;
  const rank = rows.reduce((count, row) => {
    const isNonZero = row.some((x) => Math.abs(x) > EPS);
    return count + (isNonZero ? 1 : 0);
  }, 0);
  return {
    type: { kind: "Scalar", field: "integer", precision: "exact" },
    payload: rank,
    provenance: {
      blockId: "la.rank",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
