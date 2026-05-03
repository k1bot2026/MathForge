import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class KernelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KernelError";
  }
}

const EPS = 1e-10;

/**
 * Perform RREF in-place, returning the pivot columns.
 * Returns {rref, pivotCols} where rref is the reduced matrix and
 * pivotCols is the list of column indices that contain a leading 1.
 */
function rref(src: ReadonlyArray<ReadonlyArray<number>>): {
  mat: number[][];
  pivotCols: number[];
} {
  const m = src.length;
  const n = src[0]?.length ?? 0;
  const mat: number[][] = src.map((row) => [...row]);
  const pivotCols: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < n && pivotRow < m; col++) {
    // Partial pivoting.
    let maxVal = 0;
    let maxRow = pivotRow;
    for (let r = pivotRow; r < m; r++) {
      const v = Math.abs(mat[r]?.[col] ?? 0);
      if (v > maxVal) {
        maxVal = v;
        maxRow = r;
      }
    }
    if (maxVal < EPS) continue;

    if (maxRow !== pivotRow) {
      [mat[pivotRow], mat[maxRow]] = [mat[maxRow] ?? [], mat[pivotRow] ?? []];
    }

    const pivotVal = mat[pivotRow]?.[col] ?? 1;
    const pivRow = mat[pivotRow] ?? [];
    for (let c = 0; c < n; c++) {
      pivRow[c] = (pivRow[c] ?? 0) / pivotVal;
    }

    for (let r = 0; r < m; r++) {
      if (r === pivotRow) continue;
      const factor = mat[r]?.[col] ?? 0;
      if (Math.abs(factor) < EPS) continue;
      const targetRow = mat[r] ?? [];
      for (let c = 0; c < n; c++) {
        targetRow[c] = (targetRow[c] ?? 0) - factor * (pivRow[c] ?? 0);
      }
    }

    pivotCols.push(col);
    pivotRow++;
  }

  const result = mat.map((row) => row.map((x) => (Math.abs(x) < EPS ? 0 : x)));
  return { mat: result, pivotCols };
}

export function computeKernel(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new KernelError("kernel requires input A");
  }
  const src = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = src.length;
  const n = src[0]?.length ?? 0;

  const { mat, pivotCols } = rref(src);
  const rank = pivotCols.length;
  const nullity = n - rank;

  if (nullity === 0) {
    // Trivial null space: return a zero column vector (0-column matrix would
    // be non-standard; return a single zero column to satisfy n×k with k=0
    // being representable as n×0, but our type system needs k≥0 — represent
    // as empty payload with the correct type annotation).
    return {
      type: { kind: "Matrix", m: n, n: 0, field: "real" },
      payload: [] as unknown as number[][],
      provenance: {
        blockId: "la.kernel",
        inputs: [A.provenance.blockId],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  }

  // Free columns are the columns that are NOT pivot columns.
  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < n; c++) {
    if (!pivotSet.has(c)) freeCols.push(c);
  }

  // Build one basis vector per free column:
  // For free column f, the basis vector x has x[f] = 1, x[other_free] = 0,
  // and pivot variables set to cancel: x[pivot_i] = -rref[i][f].
  const pivotColToRow = new Map<number, number>();
  for (let i = 0; i < pivotCols.length; i++) {
    const pc = pivotCols[i];
    if (pc !== undefined) pivotColToRow.set(pc, i);
  }

  const basisVectors: number[][] = freeCols.map((freeCol) => {
    const vec: number[] = new Array<number>(n).fill(0);
    vec[freeCol] = 1;
    // For each pivot column, set the corresponding entry to cancel the rref row.
    for (const [pivCol, rowIdx] of pivotColToRow) {
      vec[pivCol] = -(mat[rowIdx]?.[freeCol] ?? 0);
    }
    return vec;
  });

  // Layout: matrix is n×nullity where column j = basisVectors[j].
  const kernelMatrix: number[][] = Array.from({ length: n }, (_, row) =>
    basisVectors.map((col) => {
      const v = col[row] ?? 0;
      return Math.abs(v) < EPS ? 0 : v;
    }),
  );

  void m; // m is the number of rows of A; not needed for kernel output shape

  return {
    type: { kind: "Matrix", m: n, n: nullity, field: "real" },
    payload: kernelMatrix,
    provenance: {
      blockId: "la.kernel",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
