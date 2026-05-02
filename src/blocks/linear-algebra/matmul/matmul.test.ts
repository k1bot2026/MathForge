import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeMatMul, MatMulError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const integerMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -8, max: 8 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

function matAdd(A: number[][], B: number[][]): number[][] {
  // Normalise -0 → +0 so matAdd output matches what computeMatMul emits;
  // toEqual treats -0 ≠ 0 and would otherwise make this property test flaky.
  return A.map((row, i) =>
    row.map((x, j) => {
      const r = x + (B[i]?.[j] ?? 0);
      return r === 0 ? 0 : r;
    }),
  );
}

describe("la.matmul compute", () => {
  test("[[1,2],[3,4]] · [[5,6],[7,8]] = [[19,22],[43,50]]", () => {
    const result = computeMatMul({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
      B: mvalue([
        [5, 6],
        [7, 8],
      ]),
    });
    expect(result.payload).toEqual([
      [19, 22],
      [43, 50],
    ]);
    expect(result.type).toEqual(REAL_MATRIX(2, 2));
  });

  test("rejects mismatched inner dimensions with a typed error", () => {
    expect(() =>
      computeMatMul({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
        B: mvalue([
          [1, 2],
          [3, 4],
        ]),
      }),
    ).toThrow(MatMulError);
  });

  test("rejects missing inputs", () => {
    expect(() => computeMatMul({})).toThrow(MatMulError);
  });

  describe("algebraic properties (integer matrices, exact equality)", () => {
    test("identity: A · I = A and I · A = A", () => {
      fc.assert(
        fc.property(integerMatrix(3, 3), (A) => {
          const I = identity(3);
          expect(computeMatMul({ A: mvalue(A), B: mvalue(I) }).payload as number[][]).toEqual(A);
          expect(computeMatMul({ A: mvalue(I), B: mvalue(A) }).payload as number[][]).toEqual(A);
        }),
        { numRuns: 30 },
      );
    });

    test("associativity: (A·B)·C = A·(B·C)", () => {
      fc.assert(
        fc.property(integerMatrix(2, 3), integerMatrix(3, 2), integerMatrix(2, 4), (A, B, C) => {
          const left = computeMatMul({
            A: mvalue(computeMatMul({ A: mvalue(A), B: mvalue(B) }).payload as number[][]),
            B: mvalue(C),
          }).payload;
          const right = computeMatMul({
            A: mvalue(A),
            B: mvalue(computeMatMul({ A: mvalue(B), B: mvalue(C) }).payload as number[][]),
          }).payload;
          expect(left).toEqual(right);
        }),
        { numRuns: 30 },
      );
    });

    test("distributivity: A·(B+C) = A·B + A·C", () => {
      fc.assert(
        fc.property(integerMatrix(2, 3), integerMatrix(3, 2), integerMatrix(3, 2), (A, B, C) => {
          const BplusC = matAdd(B, C);
          const left = computeMatMul({ A: mvalue(A), B: mvalue(BplusC) }).payload as number[][];
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) }).payload as number[][];
          const AC = computeMatMul({ A: mvalue(A), B: mvalue(C) }).payload as number[][];
          expect(left).toEqual(matAdd(AB, AC));
        }),
        { numRuns: 30 },
      );
    });
  });
});
