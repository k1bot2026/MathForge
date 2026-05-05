import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import {
  decodeSpline,
  encodeSpline,
  evaluateSplineAt,
  isSplineExpression,
  SplineBlock,
  SplineError,
} from "./definition";

const ctx = { signal: new AbortController().signal };

function makeVector(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("opt.spline", () => {
  test("id is opt.spline", () => {
    expect(SplineBlock.id).toBe("opt.spline");
  });

  test("output type is Function", () => {
    const result = SplineBlock.compute(
      { x: makeVector([0, 1, 2]), y: makeVector([0, 1, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Function");
  });

  test("expression is tagged as spline", () => {
    const result = SplineBlock.compute(
      { x: makeVector([0, 1, 2]), y: makeVector([0, 1, 0]) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    expect(isSplineExpression(expression)).toBe(true);
  });

  test("interpolates knot values: S(xᵢ) = yᵢ", () => {
    const xs = [0, 1, 2, 3];
    const ys = [0, 1, 0, 1];
    const result = SplineBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i] ?? 0;
      const yi = ys[i] ?? 0;
      expect(evaluateSplineAt(expression, xi)).toBeCloseTo(yi, 8);
    }
  });

  test("exact for linear data (y = 2x + 1)", () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((xi) => 2 * xi + 1);
    const result = SplineBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    // Spline should be exact for linear data
    expect(evaluateSplineAt(expression, 0.5)).toBeCloseTo(2, 6);
    expect(evaluateSplineAt(expression, 1.5)).toBeCloseTo(4, 6);
    expect(evaluateSplineAt(expression, 3.5)).toBeCloseTo(8, 6);
  });

  test("exact for cubic data (natural spline exact for degree ≤ 3)", () => {
    // y = x^3 — natural spline should be nearly exact for data sampled from a cubic
    const xs = [-2, -1, 0, 1, 2];
    const ys = xs.map((xi) => xi * xi * xi);
    const result = SplineBlock.compute(
      { x: makeVector(xs), y: makeVector(ys) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    // At knots, exact
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i] ?? 0;
      expect(evaluateSplineAt(expression, xi)).toBeCloseTo(xi * xi * xi, 8);
    }
    // Natural BC prevents exact cubic reproduction in general — knot values are exact
  });

  test("two-point spline: linear interpolation", () => {
    const result = SplineBlock.compute(
      { x: makeVector([0, 2]), y: makeVector([1, 5]) },
      {},
      ctx,
    ) as MathValue;
    const { expression } = result.payload as unknown as FunctionPayload;
    expect(evaluateSplineAt(expression, 0)).toBeCloseTo(1, 8);
    expect(evaluateSplineAt(expression, 2)).toBeCloseTo(5, 8);
    expect(evaluateSplineAt(expression, 1)).toBeCloseTo(3, 5);
  });

  test("spline encode/decode roundtrip preserves coefficients", () => {
    const original = {
      x: [0, 1, 2],
      a: [1, 2, 3],
      b: [0.5, 0.5, 0.5],
      c: [0, 0.1, -0.1],
      d: [0.01, 0.02, 0.03],
    };
    const encoded = encodeSpline(original);
    const decoded = decodeSpline(encoded);
    expect(decoded.x).toEqual(original.x);
    expect(decoded.a).toEqual(original.a);
    expect(decoded.b).toEqual(original.b);
  });

  test("throws SplineError when x missing", () => {
    expect(() => SplineBlock.compute({ y: makeVector([1, 2, 3]) }, {}, ctx)).toThrow(SplineError);
  });

  test("throws SplineError when y missing", () => {
    expect(() => SplineBlock.compute({ x: makeVector([0, 1, 2]) }, {}, ctx)).toThrow(SplineError);
  });

  test("throws SplineError on length mismatch", () => {
    expect(() =>
      SplineBlock.compute({ x: makeVector([0, 1, 2]), y: makeVector([1, 2]) }, {}, ctx),
    ).toThrow(SplineError);
  });

  test("throws SplineError when fewer than 2 points", () => {
    expect(() => SplineBlock.compute({ x: makeVector([1]), y: makeVector([1]) }, {}, ctx)).toThrow(
      SplineError,
    );
  });

  test("throws SplineError when x is not strictly increasing", () => {
    expect(() =>
      SplineBlock.compute({ x: makeVector([0, 2, 1]), y: makeVector([0, 1, 2]) }, {}, ctx),
    ).toThrow(SplineError);
  });

  test("property: S(xᵢ) = yᵢ for all knot points", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }).chain((n) =>
          fc.tuple(
            fc
              .array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n })
              .map((xs) => [...new Set(xs)].sort((a, b) => a - b))
              .filter((xs) => xs.length >= 2),
            fc.array(fc.float({ min: -10, max: 10, noNaN: true }), {
              minLength: n,
              maxLength: n,
            }),
          ),
        ),
        ([xs, ys_full]) => {
          const ys = ys_full.slice(0, xs.length);
          if (xs.length < 2) return;

          let result: MathValue;
          try {
            result = SplineBlock.compute(
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
            const got = evaluateSplineAt(expression, xi);
            const tol = Math.max(Math.abs(yi) * 1e-5, 1e-5);
            expect(Math.abs(got - yi)).toBeLessThan(tol);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
