// `la.matvec` — matrix · vector. Given M ∈ ℝ^{m×n} and v ∈ ℝ^n,
// produces M·v ∈ ℝ^m. Phase-1 uses math.js's multiply, which returns
// a plain number[] for 2D × 1D inputs.

import { multiply } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class MatVecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatVecError";
  }
}

export function computeMatVec(inputs: ResolvedInputs): MathValue {
  const M = inputs.M;
  const v = inputs.v;
  if (M === undefined || v === undefined) {
    throw new MatVecError("matvec requires both M and v inputs");
  }
  const matrix = M.payload as ReadonlyArray<ReadonlyArray<number>>;
  const vector = v.payload as ReadonlyArray<number>;
  if (matrix.length === 0 || (matrix[0]?.length ?? 0) !== vector.length) {
    throw new MatVecError(
      `Inner dimensions don't match: M is ${matrix.length}×${matrix[0]?.length ?? 0}, v has length ${vector.length}`,
    );
  }
  const result = multiply(matrix as number[][], vector as number[]) as number[];
  // Collapse IEEE 754 negative zero per the same rationale as la.matmul.
  const normalized = result.map((x) => (x === 0 ? 0 : x));
  return {
    type: { kind: "Vector", n: normalized.length, field: "real" },
    payload: normalized,
    provenance: {
      blockId: "la.matvec",
      inputs: [M.provenance.blockId, v.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
