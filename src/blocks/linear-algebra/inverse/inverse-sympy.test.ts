/**
 * Cross-engine tests for la.inverse — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-inverse.json.
 *
 * Tolerance note: the fixture uses unimodular (|det|=1) and |det|=2
 * matrices so inverse entries are exact floats (integers or halves).
 * The 1×1 case [[-3]] has inverse -1/3, so element comparisons use
 * toBeCloseTo(x, 10) throughout for consistency.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { loadInverseFixture } from "../../../../tests/sympy-reference";
import { computeInverse } from "./compute";

const fixture = loadInverseFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function matricesClose(A: number[][], B: number[][], eps = 1e-9): boolean {
  if (A.length !== B.length) return false;
  for (let r = 0; r < A.length; r++) {
    const rowA = A[r];
    const rowB = B[r];
    if (!rowA || !rowB || rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c++) {
      if (Math.abs((rowA[c] ?? 0) - (rowB[c] ?? 0)) > eps) return false;
    }
  }
  return true;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

describe("la.inverse cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("computeInverse output matches SymPy A⁻¹", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const label = `${n}×${n} (det=${c.detA})`;
      test(label, () => {
        const result = computeInverse({ A: mvalue(c.A) }).payload as number[][];
        expect(matricesClose(result, c.Ainv, 1e-9)).toBe(true);
      });
    }
  });

  test("A · A⁻¹ === I for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const Ainv = computeInverse({ A: mvalue(c.A) });
      const product = computeMatMul({ A: mvalue(c.A), B: Ainv }).payload as number[][];
      expect(matricesClose(product, identity(n), 1e-9)).toBe(true);
    }
  });

  test("(A⁻¹)⁻¹ === A for all fixture cases", () => {
    for (const c of fixture.cases) {
      const Ainv = computeInverse({ A: mvalue(c.A) });
      const Ainvinv = computeInverse({ A: Ainv }).payload as number[][];
      expect(matricesClose(Ainvinv, c.A, 1e-9)).toBe(true);
    }
  });

  test("output type is Matrix with same n×n dimensions", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const result = computeInverse({ A: mvalue(c.A) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(n);
      expect(t.n).toBe(n);
    }
  });

  test("property: A · A⁻¹ === I for randomly generated invertible matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const n = A.length;
          const Ainv = computeInverse({ A: mvalue(A) });
          const product = computeMatMul({ A: mvalue(A), B: Ainv }).payload as number[][];
          expect(matricesClose(product, identity(n), 1e-6)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: (A·B)⁻¹ === B⁻¹ · A⁻¹ for randomly generated invertible pairs", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(invertibleMatrix(n), invertibleMatrix(n))),
        ([A, B]) => {
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const ABinv = computeInverse({ A: AB }).payload as number[][];
          const Binv = computeInverse({ A: mvalue(B) });
          const Ainv = computeInverse({ A: mvalue(A) });
          const BinvAinv = computeMatMul({ A: Binv, B: Ainv }).payload as number[][];
          expect(matricesClose(ABinv, BinvAinv, 1e-5)).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});
