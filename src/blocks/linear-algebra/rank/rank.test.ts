import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { computeRank, RankError } from "./compute";

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

describe("la.rank compute", () => {
  test("rank of 2×2 identity is 2", () => {
    expect(
      computeRank({
        A: mvalue([
          [1, 0],
          [0, 1],
        ]),
      }).payload,
    ).toBe(2);
  });

  test("rank of [[1,2],[2,4]] is 1", () => {
    expect(
      computeRank({
        A: mvalue([
          [1, 2],
          [2, 4],
        ]),
      }).payload,
    ).toBe(1);
  });

  test("rank of [[1,2,3],[4,5,6],[7,8,9]] is 2", () => {
    expect(
      computeRank({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ]),
      }).payload,
    ).toBe(2);
  });

  test("rank of all-zeros 3×3 is 0", () => {
    expect(
      computeRank({
        A: mvalue([
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ]),
      }).payload,
    ).toBe(0);
  });

  test("rank of 3×4 full-row-rank matrix is 3", () => {
    expect(
      computeRank({
        A: mvalue([
          [1, 0, 0, 1],
          [0, 1, 0, 2],
          [0, 0, 1, 3],
        ]),
      }).payload,
    ).toBe(3);
  });

  test("rejects missing input", () => {
    expect(() => computeRank({})).toThrow(RankError);
  });

  test("output type is Scalar exact", () => {
    const result = computeRank({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.type).toEqual({ kind: "Scalar", field: "integer", precision: "exact" });
  });

  test("property: rank(A) === rank(Aᵀ)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const rA = computeRank({ A: mvalue(A) }).payload as number;
          const At = computeTranspose({ A: mvalue(A) });
          const rAt = computeRank({ A: At }).payload as number;
          expect(rA).toBe(rAt);
        },
      ),
    );
  });

  test("property: rank(A·B) ≤ min(rank(A), rank(B))", () => {
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
                  .chain((n) => fc.tuple(intMatrix(m, k), intMatrix(k, n))),
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
    );
  });

  test("property: rank(I_n) === n", () => {
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
    );
  });
});

describe("la.rank definition explain", () => {
  test("effect and impact return non-empty static strings", async () => {
    const { RankBlock } = await import("./definition");
    const scalarOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "la.rank", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(RankBlock.explain.effect?.({}, scalarOut)).toBeTruthy();
    expect(RankBlock.explain.impact?.({}, scalarOut)).toBeTruthy();
  });
});
