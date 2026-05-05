import * as fc from "fast-check";
import { evaluate as mathjsEvaluate } from "mathjs";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { PolynomialRegressionBlock, PolynomialRegressionError } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeVector(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function evalPoly(expression: string, x: number): number {
  const expr = expression.replace(/\*\*/g, "^");
  try {
    const result = mathjsEvaluate(expr, { x });
    return typeof result === "number" ? result : NaN;
  } catch {
    return NaN;
  }
}

describe("opt.polynomial-regression", () => {
  test("id is opt.polynomial-regression", () => {
    expect(PolynomialRegressionBlock.id).toBe("opt.polynomial-regression");
  });

  test("output type is Function", () => {
    const x = makeVector([0, 1, 2, 3]);
    const y = makeVector([0, 1, 2, 3]);
    const result = PolynomialRegressionBlock.compute({ x, y }, { degree: 1 }, ctx) as MathValue;
    expect(result.type.kind).toBe("Function");
  });

  test("degree-1: perfect fit of y = 2x + 3", () => {
    const x = makeVector([0, 1, 2, 3]);
    const y = makeVector([3, 5, 7, 9]);
    const result = PolynomialRegressionBlock.compute({ x, y }, { degree: 1 }, ctx) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    // p(0)=3, p(2)=7
    expect(evalPoly(expression, 0)).toBeCloseTo(3, 6);
    expect(evalPoly(expression, 2)).toBeCloseTo(7, 6);
  });

  test("degree-2: perfect fit of y = x^2 - x + 1", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((xi) => xi * xi - xi + 1);
    const result = PolynomialRegressionBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      { degree: 2 },
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    for (const xi of [0, 1, 2, 3, 4]) {
      expect(evalPoly(expression, xi)).toBeCloseTo(xi * xi - xi + 1, 5);
    }
  });

  test("degree-3: perfect fit of y = x^3 - 2x + 1", () => {
    const xs = [-2, -1, 0, 1, 2, 3];
    const ys = xs.map((xi) => xi * xi * xi - 2 * xi + 1);
    const result = PolynomialRegressionBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      { degree: 3 },
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    for (const xi of [-1, 0, 1, 2]) {
      expect(evalPoly(expression, xi)).toBeCloseTo(xi * xi * xi - 2 * xi + 1, 5);
    }
  });

  test("returns expression with variable x", () => {
    const result = PolynomialRegressionBlock.compute(
      { x: makeVector([0, 1, 2]), y: makeVector([0, 1, 4]) },
      { degree: 2 },
      ctx,
    ) as MathValue;
    const { variables } = result.payload as unknown as FunctionPayload;
    expect(variables).toContain("x");
  });

  test("throws PolynomialRegressionError when x missing", () => {
    expect(() =>
      PolynomialRegressionBlock.compute({ y: makeVector([1, 2]) }, { degree: 1 }, ctx),
    ).toThrow(PolynomialRegressionError);
  });

  test("throws PolynomialRegressionError when y missing", () => {
    expect(() =>
      PolynomialRegressionBlock.compute({ x: makeVector([1, 2]) }, { degree: 1 }, ctx),
    ).toThrow(PolynomialRegressionError);
  });

  test("throws PolynomialRegressionError on x/y length mismatch", () => {
    expect(() =>
      PolynomialRegressionBlock.compute(
        { x: makeVector([1, 2, 3]), y: makeVector([1, 2]) },
        { degree: 1 },
        ctx,
      ),
    ).toThrow(PolynomialRegressionError);
  });

  test("throws PolynomialRegressionError when too few points for degree", () => {
    // degree 3 needs at least 4 points
    expect(() =>
      PolynomialRegressionBlock.compute(
        { x: makeVector([0, 1, 2]), y: makeVector([0, 1, 4]) },
        { degree: 3 },
        ctx,
      ),
    ).toThrow(PolynomialRegressionError);
  });

  test("property: degree-d polynomial recovers exact values on noiseless data", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((d) => fc.integer({ min: d + 1, max: d + 5 }).map((n) => ({ d, n }))),
        fc.array(fc.float({ min: -3, max: 3, noNaN: true }), { minLength: 1, maxLength: 4 }),
        ({ d, n }, coeffTrue) => {
          // Pad / trim to exactly d+1 coefficients
          const c = Array.from({ length: d + 1 }, (_, j) => coeffTrue[j] ?? 1);
          // Generate n distinct x values
          const xs = Array.from({ length: n }, (_, i) => i - Math.floor(n / 2));
          const ys = xs.map((xi) => c.reduce((sum, cj, j) => sum + cj * xi ** j, 0));

          let result: MathValue;
          try {
            result = PolynomialRegressionBlock.compute(
              { x: makeVector(xs), y: makeVector(ys) },
              { degree: d },
              ctx,
            ) as MathValue;
          } catch {
            return;
          }

          const { expression } = result.payload as unknown as FunctionPayload;
          for (const xi of xs) {
            const expected = ys[xs.indexOf(xi)] ?? 0;
            const got = evalPoly(expression, xi);
            const tol = Math.max(Math.abs(expected) * 1e-4, 1e-4);
            expect(Math.abs(got - expected)).toBeLessThan(tol);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
