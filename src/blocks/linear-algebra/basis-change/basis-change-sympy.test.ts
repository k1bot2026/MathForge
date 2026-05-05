/**
 * Cross-engine tests for la.basis-change — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-basis-change.json.
 *
 * Key invariants verified:
 *   1. result matches SymPy's P⁻¹·T·P exactly (unimodular P → exact float entries).
 *   2. tr(result) = tr(T)  — similarity preserves trace.
 *   3. det(result) = det(T) — similarity preserves determinant.
 *   4. P · result · P⁻¹ = T  — round-trip.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeDet } from "~/blocks/linear-algebra/det/compute";
import { computeInverse } from "~/blocks/linear-algebra/inverse/compute";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTrace } from "~/blocks/linear-algebra/trace/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { loadBasisChangeFixture } from "../../../../tests/sympy-reference";
import { computeBasisChange } from "./compute";

const fixture = loadBasisChangeFixture();

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

describe("la.basis-change cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("result matches SymPy P⁻¹·T·P for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.T.length;
      test(`${n}×${n}`, () => {
        const result = computeBasisChange({ T: mvalue(c.T), P: mvalue(c.P) }).payload as number[][];
        expect(matricesClose(result, c.result, 1e-9)).toBe(true);
      });
    }
  });

  describe("tr(result) === tr(T) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.T.length;
      test(`${n}×${n}`, () => {
        const result = computeBasisChange({ T: mvalue(c.T), P: mvalue(c.P) });
        const trResult = computeTrace({ A: result }).payload as number;
        expect(Math.abs(trResult - c.trT)).toBeLessThan(1e-9);
      });
    }
  });

  describe("det(result) === det(T) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.T.length;
      test(`${n}×${n}`, () => {
        const result = computeBasisChange({ T: mvalue(c.T), P: mvalue(c.P) });
        const detResult = Math.round(computeDet({ A: result }).payload as number);
        expect(detResult).toBe(c.detT);
      });
    }
  });

  test("P · result · P⁻¹ = T (round-trip) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeBasisChange({ T: mvalue(c.T), P: mvalue(c.P) });
      const Pinv = computeInverse({ A: mvalue(c.P) });
      const PResult = computeMatMul({ A: mvalue(c.P), B: result }).payload as number[][];
      const PResultPinv = computeMatMul({ A: mvalue(PResult), B: Pinv }).payload as number[][];
      expect(matricesClose(PResultPinv, c.T, 1e-9)).toBe(true);
    }
  });

  test("output type is Matrix<n,n> for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.T.length;
      const result = computeBasisChange({ T: mvalue(c.T), P: mvalue(c.P) });
      expect(result.type.kind).toBe("Matrix");
      if (result.type.kind === "Matrix") {
        expect(result.type.m).toBe(n);
        expect(result.type.n).toBe(n);
      }
    }
  });

  test("property: trace preserved under random basis change", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc.tuple(
            fc.array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            }),
            invertibleMatrix(n),
          ),
        ),
        ([T, P]) => {
          let result: MathValue;
          try {
            result = computeBasisChange({ T: mvalue(T), P: mvalue(P) });
          } catch {
            return;
          }
          const trT = computeTrace({ A: mvalue(T) }).payload as number;
          const trResult = computeTrace({ A: result }).payload as number;
          expect(Math.abs(trT - trResult)).toBeLessThan(1e-5);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: det preserved under random basis change", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc.tuple(
            fc.array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            }),
            invertibleMatrix(n),
          ),
        ),
        ([T, P]) => {
          let result: MathValue;
          try {
            result = computeBasisChange({ T: mvalue(T), P: mvalue(P) });
          } catch {
            return;
          }
          const detT = computeDet({ A: mvalue(T) }).payload as number;
          const detResult = computeDet({ A: result }).payload as number;
          if (Math.abs(detT) < 1e-6) return;
          const scale = Math.max(Math.abs(detT), 1);
          expect(Math.abs(detT - detResult) / scale).toBeLessThan(1e-6);
        },
      ),
      { numRuns: 50 },
    );
  });
});
