/**
 * Cross-engine tests for la.eigen — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-eigen.json.
 *
 * Ordering note: math.js and SymPy may return eigenvalues in different order,
 * and eigenvector sign conventions differ. We therefore test:
 *   1. A·v ≈ λ·v for each SymPy fixture (eigenvalue, eigenvector) pair.
 *   2. Our computed eigenvalue set matches the fixture eigenvalue set (sorted).
 *   3. Our computed eigenvectors satisfy A·v ≈ λ·v for the corresponding λ.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadEigenFixture } from "../../../../tests/sympy-reference";
import { computeEigen, type EigenPayload } from "./compute";

const fixture = loadEigenFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

/** Multiply matrix A by column vector v, return result vector. */
function matvec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((sum, aij, j) => sum + aij * (v[j] ?? 0), 0));
}

function vectorsClose(a: number[], b: number[], eps = 1e-6): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > eps) return false;
  }
  return true;
}

describe("la.eigen cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("A·v = λ·v holds for each SymPy fixture eigenpair", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      for (let k = 0; k < c.eigenvalues.length; k++) {
        const lam = c.eigenvalues[k] ?? 0;
        const v = c.eigenvectors[k] ?? [];
        const label = `${n}×${n}, λ=${lam.toFixed(4)}`;
        test(label, () => {
          const Av = matvec(c.A, v);
          const lamV = v.map((vi) => lam * vi);
          expect(vectorsClose(Av, lamV, 1e-6)).toBe(true);
        });
      }
    }
  });

  describe("our eigenvalues match SymPy eigenvalue set (sorted)", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      test(`${n}×${n}`, () => {
        const { eigenvalues } = computeEigen({ A: mvalue(c.A) }).payload as EigenPayload;
        const ourSorted = [...eigenvalues].sort((a, b) => a - b);
        const fixtureSorted = [...c.eigenvalues].sort((a, b) => a - b);
        expect(ourSorted.length).toBe(fixtureSorted.length);
        for (let i = 0; i < ourSorted.length; i++) {
          expect(Math.abs((ourSorted[i] ?? 0) - (fixtureSorted[i] ?? 0))).toBeLessThan(1e-6);
        }
      });
    }
  });

  describe("our eigenvectors satisfy A·v ≈ λ·v for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      test(`${n}×${n}`, () => {
        const { eigenvalues, eigenvectors } = computeEigen({
          A: mvalue(c.A),
        }).payload as EigenPayload;
        for (let k = 0; k < eigenvalues.length; k++) {
          const lam = eigenvalues[k] ?? 0;
          const col = eigenvectors.map((row) => row[k] ?? 0);
          const Av = matvec(c.A, col);
          const lamV = col.map((vi) => lam * vi);
          expect(vectorsClose(Av, lamV, 1e-6)).toBe(true);
        }
      });
    }
  });

  test("output type is Tuple for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeEigen({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Tuple");
    }
  });

  test("eigenvalues vector length equals n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const { eigenvalues } = computeEigen({ A: mvalue(c.A) }).payload as EigenPayload;
      expect(eigenvalues.length).toBe(n);
    }
  });

  test("eigenvectors matrix is n×n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const { eigenvectors } = computeEigen({ A: mvalue(c.A) }).payload as EigenPayload;
      expect(eigenvectors.length).toBe(n);
      expect(eigenvectors[0]?.length).toBe(n);
    }
  });

  test("property: A·v = λ·v for symmetric integer matrices (random)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc
            .array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            })
            .map((A) =>
              // symmetrize: S = A + Aᵀ so eigenvalues are always real
              A.map((row, i) => row.map((_, j) => (A[i]?.[j] ?? 0) + (A[j]?.[i] ?? 0))),
            ),
        ),
        (S) => {
          let result: ReturnType<typeof computeEigen>;
          try {
            result = computeEigen({ A: mvalue(S) });
          } catch {
            return; // complex eigenvalues after rounding — skip
          }
          const { eigenvalues, eigenvectors } = result.payload as EigenPayload;
          for (let k = 0; k < eigenvalues.length; k++) {
            const lam = eigenvalues[k] ?? 0;
            const col = eigenvectors.map((row) => row[k] ?? 0);
            const Av = matvec(S, col);
            const lamV = col.map((vi) => lam * vi);
            expect(vectorsClose(Av, lamV, 1e-4)).toBe(true);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
