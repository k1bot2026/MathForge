/**
 * Cross-engine tests for la.matrix — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-matrix.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 * TODO: Once the SymPy Pyodide worker exposes live `sympy.matmul(A, B)`
 *       etc., wire up real-time comparisons in `pnpm test:property`.
 */

import { det, multiply, trace, transpose } from "mathjs";
import { describe, expect, test } from "vitest";
import { loadMatrixFixture } from "../../../../tests/sympy-reference";

const fixture = loadMatrixFixture();

/** Normalise -0 → +0 element-wise in a 2-D array. */
function normalizeMatrix(m: number[][]): number[][] {
  return m.map((row) => row.map((x) => (x === 0 ? 0 : x)));
}

/** Normalise -0 → +0 in a flat array. */
function normalizeVector(v: number[]): number[] {
  return v.map((x) => (x === 0 ? 0 : x));
}

describe("la.matrix cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.squareCases.length).toBeGreaterThan(0);
    expect(fixture.nonSquareCases.length).toBeGreaterThan(0);
  });

  describe("A·B matches SymPy (square matrices)", () => {
    for (const c of fixture.squareCases) {
      const label = `${c.A.length}×${c.A[0]?.length} · ${c.B.length}×${c.B[0]?.length}`;
      test(label, () => {
        const result = multiply(c.A, c.B) as number[][];
        expect(normalizeMatrix(result)).toEqual(c.AB);
      });
    }
  });

  describe("A·B matches SymPy (non-square matrices)", () => {
    for (const c of fixture.nonSquareCases) {
      const label = `${c.A.length}×${c.A[0]?.length} · ${c.B.length}×${c.B[0]?.length}`;
      test(label, () => {
        const result = multiply(c.A, c.B) as number[][];
        expect(normalizeMatrix(result)).toEqual(c.AB);
      });
    }
  });

  describe("A·v matches SymPy (matvec)", () => {
    for (const c of fixture.squareCases) {
      const label = `${c.A.length}×${c.A[0]?.length} · [${c.v}]`;
      test(label, () => {
        const result = multiply(c.A, c.v) as number[];
        expect(normalizeVector(result)).toEqual(c.Av);
      });
    }
  });

  describe("Aᵀ matches SymPy (transpose)", () => {
    for (const c of fixture.squareCases) {
      const label = `transpose ${c.A.length}×${c.A[0]?.length}`;
      test(label, () => {
        const result = transpose(c.A) as number[][];
        expect(normalizeMatrix(result)).toEqual(c.At);
      });
    }
  });

  describe("tr(A) matches SymPy (trace)", () => {
    for (const c of fixture.squareCases) {
      const label = `trace ${c.A.length}×${c.A[0]?.length} = ${c.trA}`;
      test(label, () => {
        const result = trace(c.A) as number;
        const normalized = result === 0 ? 0 : result;
        expect(normalized).toBe(c.trA);
      });
    }
  });

  describe("det(A) matches SymPy (determinant)", () => {
    for (const c of fixture.squareCases) {
      const label = `det ${c.A.length}×${c.A[0]?.length} = ${c.detA}`;
      test(label, () => {
        const result = det(c.A) as number;
        // Round to nearest integer to handle floating-point accumulation;
        // all inputs are integers so SymPy det is always an exact integer.
        expect(Math.round(result)).toBe(c.detA);
      });
    }
  });

  test("(Aᵀ)ᵀ = A (transpose involution) for all square cases", () => {
    for (const c of fixture.squareCases) {
      const At = transpose(c.A) as number[][];
      const Att = transpose(At) as number[][];
      expect(normalizeMatrix(Att)).toEqual(c.A);
    }
  });

  test("det(I_n) = 1 for n = 1..4", () => {
    for (let n = 1; n <= 4; n++) {
      const I = Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
      );
      expect(Math.round(det(I) as number)).toBe(1);
    }
  });

  test("tr(A + B) = tr(A) + tr(B) for all square fixture pairs", () => {
    for (const c of fixture.squareCases) {
      const AplusB = c.A.map((row, r) => row.map((x, col) => x + (c.B[r]?.[col] ?? 0)));
      const trAplusB = trace(AplusB) as number;
      const trA = trace(c.A) as number;
      const trB = trace(c.B) as number;
      expect(Math.round(trAplusB)).toBe(Math.round(trA) + Math.round(trB));
    }
  });
});
