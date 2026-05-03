/**
 * Cross-engine tests for la.solve — compares our math.js lusolve implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-solve.json.
 *
 * Fixture design: uses unimodular (|det|=1) and |det|=2 matrices so solutions
 * x = A⁻¹·b have entries that are integers or exact halves — representable as
 * IEEE 754 doubles without rounding error. Exact equality holds for those cases.
 *
 * Singular-A error path is covered in the plain solve.test.ts (property-based).
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
import { loadSolveFixture } from "../../../../tests/sympy-reference";
import { computeSolve } from "./compute";

const fixture = loadSolveFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function mvec(payload: number[]): MathValue {
  return {
    type: { kind: "Vector", n: payload.length, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function vectorsClose(a: number[], b: number[], eps = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > eps) return false;
  }
  return true;
}

/** Compute A·x (matrix times vector). */
function matvec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((sum, aij, j) => sum + aij * (x[j] ?? 0), 0));
}

describe("la.solve cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("solution matches SymPy exact x for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const label = `${n}×${n}`;
      test(label, () => {
        const result = computeSolve({ A: mvalue(c.A), b: mvec(c.b) }).payload as number[];
        expect(vectorsClose(result, c.x, 1e-9)).toBe(true);
      });
    }
  });

  describe("A·x === b (residual check) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      test(`${n}×${n}`, () => {
        const x = computeSolve({ A: mvalue(c.A), b: mvec(c.b) }).payload as number[];
        const Ax = matvec(c.A, x);
        expect(vectorsClose(Ax, c.b, 1e-9)).toBe(true);
      });
    }
  });

  test("output type is Vector for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeSolve({ A: mvalue(c.A), b: mvec(c.b) });
      expect(result.type.kind).toBe("Vector");
    }
  });

  test("output vector length equals n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const result = computeSolve({ A: mvalue(c.A), b: mvec(c.b) }).payload as number[];
      expect(result.length).toBe(n);
    }
  });

  test("property: A·solve(A, b) === b for random invertible A", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) =>
            fc
              .tuple(
                invertibleMatrix(n),
                fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n }),
              )
              .filter(([A]) => A.length > 0),
          ),
        ([A, b]) => {
          const n = A.length;
          const x = computeSolve({ A: mvalue(A), b: mvec(b) }).payload as number[];
          const Ax = matvec(A, x);
          expect(vectorsClose(Ax, b, 1e-6)).toBe(true);
          expect(x.length).toBe(n);
        },
      ),
      { numRuns: 50 },
    );
  });
});
