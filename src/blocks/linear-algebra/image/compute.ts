import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageError";
  }
}

const EPS = 1e-10;

function rrefPivotCols(src: ReadonlyArray<ReadonlyArray<number>>): number[] {
  const m = src.length;
  const n = src[0]?.length ?? 0;
  const mat: number[][] = src.map((row) => [...row]);
  const pivotCols: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < n && pivotRow < m; col++) {
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

  return pivotCols;
}

export function computeImage(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new ImageError("image requires input A");
  }
  const src = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = src.length;
  const n = src[0]?.length ?? 0;

  const pivotCols = rrefPivotCols(src);
  const rank = pivotCols.length;

  if (rank === 0) {
    return {
      type: { kind: "Matrix", m, n: 0, field: "real" },
      payload: [] as unknown as number[][],
      provenance: {
        blockId: "la.image",
        inputs: [A.provenance.blockId],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  }

  // Extract the pivot columns from the original A (not RREF).
  // These form a basis for the column space.
  const imageMatrix: number[][] = Array.from({ length: m }, (_, row) =>
    pivotCols.map((col) => src[row]?.[col] ?? 0),
  );

  void n;

  return {
    type: { kind: "Matrix", m, n: rank, field: "real" },
    payload: imageMatrix,
    provenance: {
      blockId: "la.image",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
