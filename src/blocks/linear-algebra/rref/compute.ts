import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class RrefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RrefError";
  }
}

const EPS = 1e-10;

export function computeRref(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new RrefError("rref requires input A");
  }
  const src = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = src.length;
  const n = src[0]?.length ?? 0;

  // Work on a mutable copy.
  const mat: number[][] = src.map((row) => [...row]);

  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < m; col++) {
    // Find the row with the largest absolute value in this column (partial pivoting).
    let maxVal = 0;
    let maxRow = pivotRow;
    for (let r = pivotRow; r < m; r++) {
      const v = Math.abs(mat[r]?.[col] ?? 0);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }

    if (maxVal < EPS) continue; // All zeros in this column below pivotRow — skip.

    // Swap pivot row into position.
    if (maxRow !== pivotRow) {
      [mat[pivotRow], mat[maxRow]] = [mat[maxRow] ?? [], mat[pivotRow] ?? []];
    }

    // Scale pivot row so the pivot entry becomes 1.
    const pivotVal = mat[pivotRow]?.[col] ?? 1;
    const pivRow = mat[pivotRow] ?? [];
    for (let c = 0; c < n; c++) {
      pivRow[c] = (pivRow[c] ?? 0) / pivotVal;
    }

    // Eliminate all other rows (both above and below).
    for (let r = 0; r < m; r++) {
      if (r === pivotRow) continue;
      const factor = mat[r]?.[col] ?? 0;
      if (Math.abs(factor) < EPS) continue;
      const targetRow = mat[r] ?? [];
      for (let c = 0; c < n; c++) {
        targetRow[c] = (targetRow[c] ?? 0) - factor * (pivRow[c] ?? 0);
      }
    }

    pivotRow++;
  }

  // Normalise near-zero values to exactly 0.
  const result = mat.map((row) => row.map((x) => (Math.abs(x) < EPS ? 0 : x)));

  return {
    type: { kind: "Matrix", m, n, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.rref",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
