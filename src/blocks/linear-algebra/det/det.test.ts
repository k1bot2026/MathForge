import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { computeDet, DetError } from "./compute";

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

describe("la.det compute", () => {
  test("det([[1,0],[0,1]]) === 1", () => {
    expect(
      computeDet({
        A: mvalue([
          [1, 0],
          [0, 1],
        ]),
      }).payload,
    ).toBe(1);
  });

  test("det([[2,0],[0,3]]) === 6", () => {
    expect(
      computeDet({
        A: mvalue([
          [2, 0],
          [0, 3],
        ]),
      }).payload,
    ).toBe(6);
  });

  test("det([[1,2],[3,4]]) === -2", () => {
    expect(
      computeDet({
        A: mvalue([
          [1, 2],
          [3, 4],
        ]),
      }).payload,
    ).toBe(-2);
  });

  test("det([[1,2,3],[0,1,4],[5,6,0]]) === 1", () => {
    expect(
      computeDet({
        A: mvalue([
          [1, 2, 3],
          [0, 1, 4],
          [5, 6, 0],
        ]),
      }).payload,
    ).toBe(1);
  });

  test("rejects non-square matrix with typed error", () => {
    expect(() =>
      computeDet({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      }),
    ).toThrow(DetError);
  });

  test("rejects missing input", () => {
    expect(() => computeDet({})).toThrow(DetError);
  });

  test("output type is Scalar", () => {
    const result = computeDet({
      A: mvalue([
        [3, 1],
        [2, 7],
      ]),
    });
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
  });

  test("property: det(I) === 1", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
        const I = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
        );
        const d = computeDet({ A: mvalue(I) }).payload as number;
        expect(Math.round(d)).toBe(1);
      }),
    );
  });

  test("property: det(Aᵀ) === det(A)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => intSquareMatrix(n)),
        (A) => {
          const dA = computeDet({ A: mvalue(A) }).payload as number;
          const At = computeTranspose({ A: mvalue(A) });
          const dAt = computeDet({ A: At }).payload as number;
          expect(Math.round(dA * 1e6) / 1e6).toBe(Math.round(dAt * 1e6) / 1e6);
        },
      ),
    );
  });

  test("property: det(A·B) === det(A) · det(B)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(intSquareMatrix(n), intSquareMatrix(n))),
        ([A, B]) => {
          const dAB = computeDet({ A: computeMatMul({ A: mvalue(A), B: mvalue(B) }) })
            .payload as number;
          const dA = computeDet({ A: mvalue(A) }).payload as number;
          const dB = computeDet({ A: mvalue(B) }).payload as number;
          // Round to 4 decimal places to handle floating point drift; collapse -0 to 0.
          const round = (x: number) => {
            const r = Math.round(x * 1e4) / 1e4;
            return r === 0 ? 0 : r;
          };
          expect(round(dAB)).toBe(round(dA * dB));
        },
      ),
    );
  });
});
