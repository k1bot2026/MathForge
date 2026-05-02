import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeAdd } from "~/blocks/linear-algebra/add/compute";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { computeTrace, TraceError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const intSquareMatrix = (n: number) =>
  fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
    minLength: n,
    maxLength: n,
  });

describe("la.trace compute", () => {
  test("trace of 2×2 identity is 2", () => {
    const result = computeTrace({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.payload).toBe(2);
  });

  test("trace of [[1,2],[3,4]] is 5", () => {
    const result = computeTrace({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
    });
    expect(result.payload).toBe(5);
  });

  test("trace of 3×3 matrix [[1,2,3],[4,5,6],[7,8,9]] is 15", () => {
    const result = computeTrace({
      A: mvalue([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ]),
    });
    expect(result.payload).toBe(15);
  });

  test("rejects non-square matrix with typed error", () => {
    expect(() =>
      computeTrace({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      }),
    ).toThrow(TraceError);
  });

  test("rejects missing input", () => {
    expect(() => computeTrace({})).toThrow(TraceError);
  });

  test("output type is Scalar", () => {
    const result = computeTrace({
      A: mvalue([
        [3, 1],
        [2, 7],
      ]),
    });
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
  });

  test("property: tr(A) === tr(Aᵀ)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => intSquareMatrix(n)),
        (A) => {
          const trA = computeTrace({ A: mvalue(A) }).payload as number;
          const At = computeTranspose({ A: mvalue(A) });
          const trAt = computeTrace({ A: At }).payload as number;
          expect(trA).toBe(trAt);
        },
      ),
    );
  });

  test("property: tr(A + B) === tr(A) + tr(B)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((n) => fc.tuple(intSquareMatrix(n), intSquareMatrix(n))),
        ([A, B]) => {
          const trApB = computeTrace({ A: computeAdd({ A: mvalue(A), B: mvalue(B) }) })
            .payload as number;
          const trA = computeTrace({ A: mvalue(A) }).payload as number;
          const trB = computeTrace({ A: mvalue(B) }).payload as number;
          expect(trApB).toBe(trA + trB);
        },
      ),
    );
  });

  test("property: tr(A·B) === tr(B·A)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((n) => fc.tuple(intSquareMatrix(n), intSquareMatrix(n))),
        ([A, B]) => {
          const trAB = computeTrace({ A: computeMatMul({ A: mvalue(A), B: mvalue(B) }) })
            .payload as number;
          const trBA = computeTrace({ A: computeMatMul({ A: mvalue(B), B: mvalue(A) }) })
            .payload as number;
          expect(trAB).toBe(trBA);
        },
      ),
    );
  });
});
