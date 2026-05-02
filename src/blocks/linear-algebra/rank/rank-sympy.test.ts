/**
 * Cross-engine tests for la.rank — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-rref-rank.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { loadRrefRankFixture } from "../../../../tests/sympy-reference";
import { computeRank } from "./compute";

const fixture = loadRrefRankFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.rank cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("computeRank output matches SymPy rank(A)", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n} → rank ${c.rank}`;
      test(label, () => {
        const result = computeRank({ A: mvalue(c.A) });
        expect(result.payload).toBe(c.rank);
      });
    }
  });

  test("output type is Scalar integer exact for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeRank({ A: mvalue(c.A) });
      expect(result.type).toEqual({ kind: "Scalar", field: "integer", precision: "exact" });
    }
  });

  test("rank is non-negative and ≤ min(m, n) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const rank = computeRank({ A: mvalue(c.A) }).payload as number;
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThanOrEqual(Math.min(m, n));
    }
  });

  test("property: rank(A) === rank(Aᵀ) for random matrices", () => {
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
          const rA = computeRank({ A: mvalue(A) }).payload as number;
          const At = computeTranspose({ A: mvalue(A) });
          const rAt = computeRank({ A: At }).payload as number;
          expect(rA).toBe(rAt);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: rank(A·B) ≤ min(rank(A), rank(B)) for random matrix pairs", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((m) =>
            fc
              .integer({ min: 1, max: 3 })
              .chain((k) =>
                fc
                  .integer({ min: 1, max: 3 })
                  .chain((n) =>
                    fc.tuple(
                      fc.array(
                        fc.array(fc.integer({ min: -5, max: 5 }), { minLength: k, maxLength: k }),
                        { minLength: m, maxLength: m },
                      ),
                      fc.array(
                        fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }),
                        { minLength: k, maxLength: k },
                      ),
                    ),
                  ),
              ),
          ),
        ([A, B]) => {
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const rAB = computeRank({ A: AB }).payload as number;
          const rA = computeRank({ A: mvalue(A) }).payload as number;
          const rB = computeRank({ A: mvalue(B) }).payload as number;
          expect(rAB).toBeLessThanOrEqual(Math.min(rA, rB));
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: rank(I_n) === n for n=1..4", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
        const I = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
        );
        expect(computeRank({ A: mvalue(I) }).payload).toBe(n);
      }),
    );
  });

  test("property: invertible n×n matrix has rank n", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const n = A.length;
          expect(computeRank({ A: mvalue(A) }).payload).toBe(n);
        },
      ),
      { numRuns: 50 },
    );
  });
});
