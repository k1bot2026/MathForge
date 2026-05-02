import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeRref, RrefError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

function roundMatrix(m: number[][]): number[][] {
  return m.map((row) =>
    row.map((x) => {
      const r = Math.round(x * 1e9) / 1e9;
      return r === 0 ? 0 : r;
    }),
  );
}

describe("la.rref compute", () => {
  test("rref of identity is identity", () => {
    const result = computeRref({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.payload).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  test("rref of upper-triangular full-rank 2×2", () => {
    // [[2,4],[0,3]] → [[1,0],[0,1]] (back-substitution eliminates the (0,1) entry)
    const result = computeRref({
      A: mvalue([
        [2, 4],
        [0, 3],
      ]),
    });
    expect(result.payload).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  test("rref of [[1,2,3],[4,5,6],[7,8,9]] (rank 2)", () => {
    const result = computeRref({
      A: mvalue([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]),
    });
    const p = result.payload as number[][];
    // Expect row-echelon form with leading 1s and zero bottom row
    expect(roundMatrix(p)).toEqual([
      [1, 0, -1],
      [0, 1, 2],
      [0, 0, 0],
    ]);
  });

  test("rref of all-zeros matrix is all-zeros", () => {
    const result = computeRref({
      A: mvalue([
        [0, 0],
        [0, 0],
      ]),
    });
    expect(result.payload).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test("rref of 1×1 [[5]] is [[1]]", () => {
    const result = computeRref({ A: mvalue([[5]]) });
    expect(result.payload).toEqual([[1]]);
  });

  test("rref of 1×1 [[0]] is [[0]]", () => {
    const result = computeRref({ A: mvalue([[0]]) });
    expect(result.payload).toEqual([[0]]);
  });

  test("rejects missing input", () => {
    expect(() => computeRref({})).toThrow(RrefError);
  });

  test("output type is Matrix with same shape", () => {
    const result = computeRref({
      A: mvalue([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    });
    expect(result.type).toEqual({ kind: "Matrix", m: 2, n: 3, field: "real" });
  });

  test("property: idempotence — rref(rref(A)) === rref(A)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const r1 = computeRref({ A: mvalue(A) }).payload as number[][];
          const r2 = computeRref({ A: computeRref({ A: mvalue(A) }) }).payload as number[][];
          expect(roundMatrix(r2)).toEqual(roundMatrix(r1));
        },
      ),
    );
  });

  test("property: each non-zero row has a leading 1", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const rows = computeRref({ A: mvalue(A) }).payload as number[][];
          for (const row of rows) {
            const firstNonZero = row.find((x) => Math.abs(x) > 1e-9);
            if (firstNonZero !== undefined) {
              expect(Math.abs(firstNonZero - 1)).toBeLessThan(1e-9);
            }
          }
        },
      ),
    );
  });

  test("property: zero rows are at the bottom", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const rows = computeRref({ A: mvalue(A) }).payload as number[][];
          let seenNonZero = false;
          for (let i = rows.length - 1; i >= 0; i--) {
            const isZero = (rows[i] ?? []).every((x) => Math.abs(x) < 1e-9);
            if (!isZero) seenNonZero = true;
            if (seenNonZero && isZero) {
              // A zero row appeared above a non-zero row — violation
              expect(isZero).toBe(false);
            }
          }
        },
      ),
    );
  });
});
