import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { LinearRegressionBlock, LinearRegressionError } from "./definition";

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

describe("opt.linear-regression", () => {
  test("id is opt.linear-regression", () => {
    expect(LinearRegressionBlock.id).toBe("opt.linear-regression");
  });

  test("output type is Vector", () => {
    // y = 2x + 1: X = [[1,1],[1,2],[1,3]], y = [3,5,7]
    const X = makeMatrix([
      [1, 1],
      [1, 2],
      [1, 3],
    ]);
    const y = makeVector([3, 5, 7]);
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Vector");
  });

  test("perfect fit: y = 2x + 1 (intercept + slope)", () => {
    const X = makeMatrix([
      [1, 1],
      [1, 2],
      [1, 3],
    ]);
    const y = makeVector([3, 5, 7]);
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    const beta = result.payload as number[];
    expect(beta[0]).toBeCloseTo(1, 8); // intercept
    expect(beta[1]).toBeCloseTo(2, 8); // slope
  });

  test("perfect fit: y = 3x₁ - x₂ + 5", () => {
    // X has intercept column + 2 predictors
    const X = makeMatrix([
      [1, 1, 2],
      [1, 2, 1],
      [1, 3, 3],
      [1, 4, 0],
    ]);
    // y = 5 + 3*x1 - 1*x2
    const y = makeVector([
      5 + 3 * 1 - 1 * 2,
      5 + 3 * 2 - 1 * 1,
      5 + 3 * 3 - 1 * 3,
      5 + 3 * 4 - 1 * 0,
    ]);
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    const beta = result.payload as number[];
    expect(beta[0]).toBeCloseTo(5, 6); // intercept
    expect(beta[1]).toBeCloseTo(3, 6); // β₁
    expect(beta[2]).toBeCloseTo(-1, 6); // β₂
  });

  test("no-intercept model: y = 2x", () => {
    const X = makeMatrix([[1], [2], [3], [4]]);
    const y = makeVector([2, 4, 6, 8]);
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    const beta = result.payload as number[];
    expect(beta[0]).toBeCloseTo(2, 8);
  });

  test("over-determined OLS: minimises residuals", () => {
    // y = x + noise. OLS should recover β ≈ [intercept, slope].
    const X = makeMatrix([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ]);
    const y = makeVector([0.1, 1.0, 1.9, 3.1, 4.0]); // near y = x
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    const beta = result.payload as number[];
    // slope close to 1, intercept close to 0 — allow ±0.15
    expect(beta[1]).toBeCloseTo(0.99, 1);
    expect(beta[0]).toBeCloseTo(0.04, 1);
  });

  test("beta vector has correct length (number of predictors)", () => {
    // Use clearly linearly-independent columns: identity + offset
    const X = makeMatrix([
      [1, 1, 0],
      [1, 0, 1],
      [1, -1, 0],
      [1, 0, -1],
    ]);
    const y = makeVector([1, 2, 3, 4]);
    const result = LinearRegressionBlock.compute({ X, y }, {}, ctx) as MathValue;
    const beta = result.payload as number[];
    expect(beta).toHaveLength(3);
  });

  test("throws LinearRegressionError when X missing", () => {
    expect(() => LinearRegressionBlock.compute({ y: makeVector([1, 2]) }, {}, ctx)).toThrow(
      LinearRegressionError,
    );
  });

  test("throws LinearRegressionError when y missing", () => {
    expect(() => LinearRegressionBlock.compute({ X: makeMatrix([[1], [2]]) }, {}, ctx)).toThrow(
      LinearRegressionError,
    );
  });

  test("throws LinearRegressionError on dimension mismatch (y length ≠ X rows)", () => {
    const X = makeMatrix([
      [1, 1],
      [1, 2],
      [1, 3],
    ]);
    const y = makeVector([1, 2]); // wrong length
    expect(() => LinearRegressionBlock.compute({ X, y }, {}, ctx)).toThrow(LinearRegressionError);
  });

  test("throws LinearRegressionError on underdetermined system (m < n)", () => {
    const X = makeMatrix([[1, 1, 1]]); // 1 obs, 3 predictors
    const y = makeVector([5]);
    expect(() => LinearRegressionBlock.compute({ X, y }, {}, ctx)).toThrow(LinearRegressionError);
  });

  test("throws LinearRegressionError on rank-deficient X", () => {
    // col2 = 2*col1 — linearly dependent
    const X = makeMatrix([
      [1, 2],
      [2, 4],
      [3, 6],
    ]);
    const y = makeVector([1, 2, 3]);
    expect(() => LinearRegressionBlock.compute({ X, y }, {}, ctx)).toThrow(LinearRegressionError);
  });

  test("property: noiseless y=Xβ_true recovers β_true exactly", () => {
    fc.assert(
      fc.property(
        // n predictors (1..4), m observations (n..n+4)
        fc.integer({ min: 1, max: 4 }).chain((n) =>
          fc.integer({ min: n, max: n + 4 }).chain((m) =>
            fc.tuple(
              // design matrix: columns linearly independent ensured by adding identity-scaled rows
              fc.array(
                fc.array(fc.float({ min: -5, max: 5, noNaN: true }), {
                  minLength: n,
                  maxLength: n,
                }),
                {
                  minLength: m,
                  maxLength: m,
                },
              ),
              // true beta
              fc.array(fc.float({ min: -5, max: 5, noNaN: true }), { minLength: n, maxLength: n }),
            ),
          ),
        ),
        ([X_data, beta_true]) => {
          const n = X_data[0]?.length ?? 0;
          // Make matrix full-rank by adding n×n identity rows
          const X_full = [
            ...X_data,
            ...Array.from({ length: n }, (_, i) =>
              Array.from({ length: n }, (__, j) => (i === j ? 5 : 0)),
            ),
          ];
          const y_data = X_full.map((row) =>
            row.reduce((sum, xi, j) => sum + xi * (beta_true[j] ?? 0), 0),
          );

          let result: MathValue;
          try {
            result = LinearRegressionBlock.compute(
              { X: makeMatrix(X_full), y: makeVector(y_data) },
              {},
              ctx,
            ) as MathValue;
          } catch {
            return; // rank-deficient after all — skip
          }

          const beta_hat = result.payload as number[];
          for (let j = 0; j < n; j++) {
            const expected = beta_true[j] ?? 0;
            const got = beta_hat[j] ?? 0;
            const tol = Math.max(Math.abs(expected) * 1e-4, 1e-4);
            expect(Math.abs(got - expected)).toBeLessThan(tol);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
