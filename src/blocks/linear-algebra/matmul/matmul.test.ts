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

  test("polymorphic: 3×4 · 4×2 = 3×2 output shape", () => {
    const A = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
    ];
    const B = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];
    const result = computeMatMul({ A: mvalue(A), B: mvalue(B) });
    expect(result.type).toEqual(REAL_MATRIX(3, 2));
    expect(result.payload).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  test("polymorphic: output type reflects m×n from input shapes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((m) =>
          fc.integer({ min: 1, max: 4 }).chain((k) =>
            fc.integer({ min: 1, max: 4 }).chain((n) =>
              fc.tuple(
                fc.constant(m),
                fc.constant(n),
                fc.array(
                  fc.array(fc.integer({ min: -3, max: 3 }), { minLength: k, maxLength: k }),
                  {
                    minLength: m,
                    maxLength: m,
                  },
                ),
                fc.array(
                  fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }),
                  {
                    minLength: k,
                    maxLength: k,
                  },
                ),
              ),
            ),
          ),
        ),
        ([m, n, A, B]) => {
          const result = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const t = result.type as { m: number; n: number };
          expect(t.m).toBe(m);
          expect(t.n).toBe(n);
          const payload = result.payload as number[][];
          expect(payload.length).toBe(m);
          for (const row of payload) {
            expect(row.length).toBe(n);
          }
        },
      ),
    );
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
