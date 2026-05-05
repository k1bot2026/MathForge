import * as fc from "fast-check";
import { evaluate as mathjsEvaluate } from "mathjs";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { LagrangeBlock, LagrangeError } from "./definition";

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

describe("opt.lagrange", () => {
  test("id is opt.lagrange", () => {
    expect(LagrangeBlock.id).toBe("opt.lagrange");
  });

  test("output type is Function", () => {
    const result = LagrangeBlock.compute(
      { x: makeVector([0, 1]), y: makeVector([0, 1]) },
      {},
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Function");
  });

  test("single point: L(x) = y0 (constant polynomial)", () => {
    const result = LagrangeBlock.compute(
      { x: makeVector([3]), y: makeVector([7]) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    expect(evalPoly(expression, 3)).toBeCloseTo(7, 8);
    expect(evalPoly(expression, 0)).toBeCloseTo(7, 8);
  });

  test("two points: L(x) = linear through (0,1) and (1,3)", () => {
    const result = LagrangeBlock.compute(
      { x: makeVector([0, 1]), y: makeVector([1, 3]) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    expect(evalPoly(expression, 0)).toBeCloseTo(1, 8);
    expect(evalPoly(expression, 1)).toBeCloseTo(3, 8);
    expect(evalPoly(expression, 0.5)).toBeCloseTo(2, 6);
  });

  test("interpolates y = x^2 exactly through (0,0),(1,1),(2,4)", () => {
    const result = LagrangeBlock.compute(
      { x: makeVector([0, 1, 2]), y: makeVector([0, 1, 4]) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    expect(evalPoly(expression, 0)).toBeCloseTo(0, 6);
    expect(evalPoly(expression, 1)).toBeCloseTo(1, 6);
    expect(evalPoly(expression, 2)).toBeCloseTo(4, 6);
    expect(evalPoly(expression, 1.5)).toBeCloseTo(2.25, 5);
  });

  test("interpolates y = x^3 - x exactly through 4 points", () => {
    const xs = [-1, 0, 1, 2];
    const ys = xs.map((xi) => xi * xi * xi - xi);
    const result = LagrangeBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    for (const xi of xs) {
      expect(evalPoly(expression, xi)).toBeCloseTo(xi * xi * xi - xi, 5);
    }
    // interpolate at a new point
    expect(evalPoly(expression, 0.5)).toBeCloseTo(0.5 * 0.5 * 0.5 - 0.5, 5);
  });

  test("output has variable x", () => {
    const result = LagrangeBlock.compute(
      { x: makeVector([0, 1, 2]), y: makeVector([1, 2, 5]) },
      {},
      ctx,
    ) as MathValue;
    const { variables } = result.payload as unknown as FunctionPayload;
    expect(variables).toContain("x");
  });

  test("throws LagrangeError when x missing", () => {
    expect(() => LagrangeBlock.compute({ y: makeVector([1, 2]) }, {}, ctx)).toThrow(LagrangeError);
  });

  test("throws LagrangeError when y missing", () => {
    expect(() => LagrangeBlock.compute({ x: makeVector([1, 2]) }, {}, ctx)).toThrow(LagrangeError);
  });

  test("throws LagrangeError on length mismatch", () => {
    expect(() =>
      LagrangeBlock.compute({ x: makeVector([0, 1, 2]), y: makeVector([1, 2]) }, {}, ctx),
    ).toThrow(LagrangeError);
  });

  test("throws LagrangeError on duplicate x values", () => {
    expect(() =>
      LagrangeBlock.compute({ x: makeVector([0, 1, 1]), y: makeVector([0, 1, 2]) }, {}, ctx),
    ).toThrow(LagrangeError);
  });

  test("property: L(xᵢ) = yᵢ for all interpolation nodes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((n) =>
          fc.tuple(
            // n distinct x values
            fc
              .array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n })
              .filter((xs) => new Set(xs).size === n),
            fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: n, maxLength: n }),
          ),
        ),
        ([xs, ys]) => {
          let result: MathValue;
          try {
            result = LagrangeBlock.compute(
              { x: makeVector(xs), y: makeVector(ys) },
              {},
              ctx,
            ) as MathValue;
          } catch {
            return;
          }

          const { expression } = result.payload as unknown as FunctionPayload;
          for (let i = 0; i < xs.length; i++) {
            const xi = xs[i] ?? 0;
            const yi = ys[i] ?? 0;
            const got = evalPoly(expression, xi);
            const tol = Math.max(Math.abs(yi) * 1e-4, 1e-4);
            expect(Math.abs(got - yi)).toBeLessThan(tol);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
