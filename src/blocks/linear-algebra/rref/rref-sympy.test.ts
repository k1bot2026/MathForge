/**
 * Cross-engine tests for la.rref — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-rref-rank.json.
 *
 * Tolerance: RREF entries should be exact floats (0 or 1) for integer
 * inputs except for rank-deficient rows which are zero. We compare with
 * toBeCloseTo(x, 9) for non-trivial pivots.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { loadRrefRankFixture } from "../../../../tests/sympy-reference";
import { computeRref } from "./compute";

const fixture = loadRrefRankFixture();

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

describe("la.rref cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("computeRref output matches SymPy rref(A)", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n} (rank=${c.rank})`;
      test(label, () => {
        const result = computeRref({ A: mvalue(c.A) }).payload as number[][];
        expect(matricesClose(result, c.rref, 1e-9)).toBe(true);
      });
    }
  });

  test("output dimensions equal input dimensions for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const result = computeRref({ A: mvalue(c.A) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(m);
      expect(t.n).toBe(n);
    }
  });

  test("pivot columns contain leading-1 in the correct row for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeRref({ A: mvalue(c.A) }).payload as number[][];
      for (let pivotIdx = 0; pivotIdx < c.pivots.length; pivotIdx++) {
        const col = c.pivots[pivotIdx];
        if (col === undefined) continue;
        const pivotEntry = result[pivotIdx]?.[col];
        expect(pivotEntry).toBeCloseTo(1, 9);
      }
    }
  });

  test("zero rows appear at the bottom for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeRref({ A: mvalue(c.A) }).payload as number[][];
      let foundZeroRow = false;
      for (const row of result) {
        const isZeroRow = row.every((x) => Math.abs(x) < 1e-9);
        if (isZeroRow) {
          foundZeroRow = true;
        } else if (foundZeroRow) {
          // Non-zero row after a zero row — violated invariant
          expect(false).toBe(true);
        }
      }
    }
  });

  test("property: rref(rref(A)) === rref(A) (idempotence)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((m) =>
          fc.integer({ min: 1, max: 4 }).chain((n) =>
            fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
              minLength: m,
              maxLength: m,
            }),
          ),
        ),
        (A) => {
          const rref1 = computeRref({ A: mvalue(A) });
          const rref2 = computeRref({ A: rref1 }).payload as number[][];
          const r1 = rref1.payload as number[][];
          expect(matricesClose(rref2, r1, 1e-9)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: rref(I_n) === I_n for all n=1..4", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
        const I = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
        );
        const result = computeRref({ A: mvalue(I) }).payload as number[][];
        expect(matricesClose(result, I, 1e-9)).toBe(true);
      }),
    );
  });

  test("property: rref of invertible n×n matrix equals I_n", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const n = A.length;
          const I = Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
          );
          const result = computeRref({ A: mvalue(A) }).payload as number[][];
          expect(matricesClose(result, I, 1e-9)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
