// `la.matmul` — matrix × matrix. A ∈ ℝ^{m×k}, B ∈ ℝ^{k×n}, A·B ∈ ℝ^{m×n}.

import { multiply } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class MatMulError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatMulError";
  }
}

export function computeMatMul(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  const B = inputs.B;
  if (A === undefined || B === undefined) {
    throw new MatMulError("matmul requires both A and B inputs");
  }
  const ap = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const bp = B.payload as ReadonlyArray<ReadonlyArray<number>>;
  const ak = ap[0]?.length ?? 0;
  const bm = bp.length;
  if (ak !== bm) {
    throw new MatMulError(
      `Inner dimensions don't match: A is ${ap.length}×${ak}, B is ${bm}×${bp[0]?.length ?? 0}`,
    );
  }
  const result = multiply(ap as number[][], bp as number[][]) as number[][];
  // Collapse IEEE 754 negative zero to positive zero so equality tests
  // (and the inspector's "0" vs "-0" rendering) behave intuitively.
  const normalized = result.map((row) => row.map((x) => (x === 0 ? 0 : x)));
  return {
    type: {
      kind: "Matrix",
      m: normalized.length,
      n: normalized[0]?.length ?? 0,
      field: "real",
    },
    payload: normalized,
    provenance: {
      blockId: "la.matmul",
      inputs: [A.provenance.blockId, B.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
