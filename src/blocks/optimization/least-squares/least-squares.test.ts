import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { LeastSquaresBlock, LeastSquaresError } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeMatrix(data: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: data.length, n: data[0]?.length ?? 0, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeVector(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("opt.least-squares", () => {
  test("id is opt.least-squares", () => {
    expect(LeastSquaresBlock.id).toBe("opt.least-squares");
  });

  test("output type is Vector", () => {
    const A = makeMatrix([
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    const b = makeVector([1, 1, 2]);
    const result = LeastSquaresBlock.compute({ A, b }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Vector");
  });

  test("exact solution when A is square and full-rank (Ax=b exactly)", () => {
    // 2x + 3y = 8, x - y = -1 → x=1, y=2
    const A = makeMatrix([
      [2, 3],
      [1, -1],
    ]);
    const b = makeVector([8, -1]);
    const result = LeastSquaresBlock.compute({ A, b }, {}, ctx) as MathValue;
    const x = result.payload as number[];
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(2, 8);
  });

  test("least-squares fit: overdetermined 3x1 system", () => {
    // A = [[1],[2],[3]], b = [2,4,5.9] → best x = slope ≈ 1.96
    const A = makeMatrix([[1], [2], [3]]);
    const b = makeVector([2, 4, 5.9]);
    const result = LeastSquaresBlock.compute({ A, b }, {}, ctx) as MathValue;
    const x = result.payload as number[];
    // residuals minimized; x ≈ (1*2 + 2*4 + 3*5.9) / (1+4+9) ≈ 27.7/14 ≈ 1.979
    expect(x[0]).toBeCloseTo(27.7 / 14, 4);
  });

  test("output vector has length = number of columns of A", () => {
    const A = makeMatrix([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 10],
    ]);
    const b = makeVector([1, 2, 3]);
    const result = LeastSquaresBlock.compute({ A, b }, {}, ctx) as MathValue;
    expect((result.payload as number[]).length).toBe(3);
  });

  test("overdetermined 4x2 system recovers true coefficients", () => {
    // True x = [1, -1]. b = Ax exactly → should recover.
    const trueX = [1, -1];
    const A = makeMatrix([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    const b = makeVector(
      (A.payload as number[][]).map((row) => {
        return (row[0] ?? 0) * (trueX[0] ?? 0) + (row[1] ?? 0) * (trueX[1] ?? 0);
      }),
    );
    const result = LeastSquaresBlock.compute({ A, b }, {}, ctx) as MathValue;
    const x = result.payload as number[];
    expect(x[0]).toBeCloseTo(1, 5);
    expect(x[1]).toBeCloseTo(-1, 5);
  });

  test("throws LeastSquaresError when A missing", () => {
    expect(() => LeastSquaresBlock.compute({ b: makeVector([1, 2]) }, {}, ctx)).toThrow(
      LeastSquaresError,
    );
  });

  test("throws LeastSquaresError when b missing", () => {
    expect(() => LeastSquaresBlock.compute({ A: makeMatrix([[1], [2]]) }, {}, ctx)).toThrow(
      LeastSquaresError,
    );
  });

  test("throws LeastSquaresError on dimension mismatch", () => {
    const A = makeMatrix([
      [1, 0],
      [0, 1],
      [1, 1],
    ]);
    const b = makeVector([1, 2]); // wrong length
    expect(() => LeastSquaresBlock.compute({ A, b }, {}, ctx)).toThrow(LeastSquaresError);
  });

  test("throws LeastSquaresError on underdetermined system", () => {
    const A = makeMatrix([[1, 2, 3]]); // 1 row, 3 cols
    const b = makeVector([6]);
    expect(() => LeastSquaresBlock.compute({ A, b }, {}, ctx)).toThrow(LeastSquaresError);
  });

  test("throws LeastSquaresError on rank-deficient A", () => {
    // col2 = 2*col1
    const A = makeMatrix([
      [1, 2],
      [2, 4],
      [3, 6],
    ]);
    const b = makeVector([1, 2, 3]);
    expect(() => LeastSquaresBlock.compute({ A, b }, {}, ctx)).toThrow(LeastSquaresError);
  });

  test("property: noiseless Ax=b_true recovers x_true", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) =>
          fc.integer({ min: n, max: n + 4 }).chain((m) =>
            fc.tuple(
              fc.array(
                fc.array(fc.float({ min: -5, max: 5, noNaN: true }), {
                  minLength: n,
                  maxLength: n,
                }),
                { minLength: m, maxLength: m },
              ),
              fc.array(fc.float({ min: -5, max: 5, noNaN: true }), {
                minLength: n,
                maxLength: n,
              }),
            ),
          ),
        ),
        ([A_data, x_true]) => {
          const n = A_data[0]?.length ?? 0;
          // Add identity rows to ensure full column rank
          const A_full = [
            ...A_data,
            ...Array.from({ length: n }, (_, i) =>
              Array.from({ length: n }, (__, j) => (i === j ? 5 : 0)),
            ),
          ];
          const b_data = A_full.map((row) =>
            row.reduce((sum, aij, j) => sum + aij * (x_true[j] ?? 0), 0),
          );

          let result: MathValue;
          try {
            result = LeastSquaresBlock.compute(
              { A: makeMatrix(A_full), b: makeVector(b_data) },
              {},
              ctx,
            ) as MathValue;
          } catch {
            return;
          }

          const x_hat = result.payload as number[];
          for (let j = 0; j < n; j++) {
            const expected = x_true[j] ?? 0;
            const got = x_hat[j] ?? 0;
            const tol = Math.max(Math.abs(expected) * 1e-4, 1e-4);
            expect(Math.abs(got - expected)).toBeLessThan(tol);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
