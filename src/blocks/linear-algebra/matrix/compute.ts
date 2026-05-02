import type { MathValue } from "~/math/types";

function toFinite(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Builds an m×n real matrix from a 2-D array of values (row-major).
 * Missing rows/columns default to 0; non-finite values coerce to 0.
 */
export function computeMatrix(
  m: number,
  n: number,
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): MathValue {
  const payload: number[][] = Array.from({ length: m }, (_, r) =>
    Array.from({ length: n }, (_, c) => toFinite(rows[r]?.[c])),
  );
  return {
    type: { kind: "Matrix", m, n, field: "real" },
    payload,
    provenance: {
      blockId: "la.matrix",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
