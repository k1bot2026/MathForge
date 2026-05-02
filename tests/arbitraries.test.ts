/**
 * Tests for the fast-check arbitraries in tests/arbitraries.ts.
 * Verifies that generated values satisfy their documented invariants.
 */

import fc from "fast-check";
import { det, multiply, transpose } from "mathjs";
import { describe, expect, test } from "vitest";
import { invertibleMatrix, orthogonalMatrix } from "./arbitraries";

function closeTo(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

function matricesClose(A: number[][], B: number[][], eps = 1e-9): boolean {
  if (A.length !== B.length) return false;
  for (let r = 0; r < A.length; r++) {
    const rowA = A[r];
    const rowB = B[r];
    if (!rowA || !rowB || rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c++) {
      if (!closeTo(rowA[c] ?? 0, rowB[c] ?? 0, eps)) return false;
    }
  }
  return true;
}

describe("invertibleMatrix", () => {
  test("property: det(A) ≠ 0 for all generated matrices, n=1..4", () => {
    for (let n = 1; n <= 4; n++) {
      fc.assert(
        fc.property(invertibleMatrix(n), (A) => {
          expect(Math.abs(det(A) as number)).toBeGreaterThan(0.5);
        }),
        { numRuns: 50 },
      );
    }
  });

  test("property: generated matrix is n×n", () => {
    for (let n = 1; n <= 4; n++) {
      fc.assert(
        fc.property(invertibleMatrix(n), (A) => {
          expect(A.length).toBe(n);
          for (const row of A) {
            expect(row.length).toBe(n);
          }
        }),
        { numRuns: 30 },
      );
    }
  });

  test("property: entries are integers in [-5, 5]", () => {
    for (let n = 1; n <= 3; n++) {
      fc.assert(
        fc.property(invertibleMatrix(n), (A) => {
          for (const row of A) {
            for (const x of row) {
              expect(Number.isInteger(x)).toBe(true);
              expect(x).toBeGreaterThanOrEqual(-5);
              expect(x).toBeLessThanOrEqual(5);
            }
          }
        }),
        { numRuns: 30 },
      );
    }
  });
});

describe("orthogonalMatrix", () => {
  test("property: Q^T · Q = I for all generated matrices, n=1..4", () => {
    for (let n = 1; n <= 4; n++) {
      fc.assert(
        fc.property(orthogonalMatrix(n), (Q) => {
          const Qt = transpose(Q) as number[][];
          const QtQ = multiply(Qt, Q) as number[][];
          const I = Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
          );
          expect(matricesClose(QtQ, I, 1e-9)).toBe(true);
        }),
        { numRuns: 50 },
      );
    }
  });

  test("property: det(Q) = ±1 for all generated matrices", () => {
    for (let n = 1; n <= 4; n++) {
      fc.assert(
        fc.property(orthogonalMatrix(n), (Q) => {
          const d = Math.abs(det(Q) as number);
          expect(closeTo(d, 1, 1e-9)).toBe(true);
        }),
        { numRuns: 50 },
      );
    }
  });

  test("property: generated matrix is n×n", () => {
    for (let n = 1; n <= 4; n++) {
      fc.assert(
        fc.property(orthogonalMatrix(n), (Q) => {
          expect(Q.length).toBe(n);
          for (const row of Q) {
            expect(row.length).toBe(n);
          }
        }),
        { numRuns: 30 },
      );
    }
  });

  test("identity matrix is a valid orthogonal matrix (zero rotations edge case)", () => {
    // Shrink path terminates at identity — verify identity satisfies Q^T·Q=I.
    const I = [[1]];
    const Qt = transpose(I) as number[][];
    const QtQ = multiply(Qt, I) as number[][];
    expect(matricesClose(QtQ, I)).toBe(true);
  });
});
