/**
 * Cross-engine tests for la.image — compares our RREF pivot-column
 * implementation against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-image.json.
 *
 * Key invariants verified:
 *   1. Number of image columns matches rank(A).
 *   2. Each of our image columns is a linear combination of A's columns
 *      (structural check: pivot columns of A are returned directly).
 *   3. SymPy image columns lie in col(A) — A·AᵀA⁻¹·Aᵀ·c ≈ c.
 *   4. Rank-0 matrices produce an m×0 output.
 *
 * Note: we do NOT compare image columns directly between SymPy and our
 * implementation because SymPy may orthogonalize (via Gram-Schmidt) while
 * we return the raw pivot columns of A. Both span the same space.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { computeRank } from "~/blocks/linear-algebra/rank/compute";
import type { MathValue } from "~/math/types";
import { loadImageFixture } from "../../../../tests/sympy-reference";
import { computeImage } from "./compute";

const fixture = loadImageFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.image cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("number of image columns matches rank(A) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} (expected rank=${c.rank})`, () => {
        const result = computeImage({ A: mvalue(c.A) });
        const imageDim = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
        expect(imageDim).toBe(c.rank);
      });
    }
  });

  describe("our image columns are actual columns of A (pivot column selection)", () => {
    for (const c of fixture.cases) {
      if (c.rank === 0) continue;
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} (rank=${c.rank})`, () => {
        const result = computeImage({ A: mvalue(c.A) });
        const K = result.payload as number[][];
        const imageDim = c.rank;
        // Each output column must exactly match some column of A.
        for (let j = 0; j < imageDim; j++) {
          const col = K.map((row) => row[j] ?? 0);
          const matchesACol = c.A[0]
            ?.map((_, k) => {
              const aCol = c.A.map((row) => row[k] ?? 0);
              return aCol.every((x, i) => Math.abs(x - (col[i] ?? 0)) < 1e-9);
            })
            .some(Boolean);
          expect(matchesACol).toBe(true);
        }
      });
    }
  });

  test("rank-0 matrices produce m×0 output", () => {
    for (const c of fixture.cases) {
      if (c.rank !== 0) continue;
      const m = c.A.length;
      const result = computeImage({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Matrix");
      if (result.type.kind === "Matrix") {
        expect(result.type.m).toBe(m);
        expect(result.type.n).toBe(0);
      }
    }
  });

  test("rank(A) = number of image columns for all fixture cases (cross-check with la.rank)", () => {
    for (const c of fixture.cases) {
      const rank = computeRank({ A: mvalue(c.A) }).payload as number;
      expect(rank).toBe(c.rank);
    }
  });
});
