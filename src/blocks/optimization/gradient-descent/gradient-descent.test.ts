import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { GradientDescentBlock, GradientDescentError } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeFunction(expression: string, variables: string[]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: variables.length,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as VectorPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeVector(values: number[]): MathValue {
  return {
    type: { kind: "Vector", n: values.length, field: "real" },
    payload: values as VectorPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// f(x) = x^2  — minimum at x=0, value=0
const quadratic1d = makeFunction("x**2", ["x"]);
const init1d = makeVector([3]);

// f(x, y) = x^2 + y^2  — minimum at (0,0), value=0
const quadratic2d = makeFunction("x**2 + y**2", ["x", "y"]);
const init2d = makeVector([2, 2]);

// f(x) = (x-3)^2  — minimum at x=3, value=0
const shiftedQuadratic = makeFunction("(x - 3)**2", ["x"]);
const initShifted = makeVector([0]);

describe("solveGradientDescent (via block)", () => {
  test("id is opt.gradient-descent", () => {
    expect(GradientDescentBlock.id).toBe("opt.gradient-descent");
  });

  test("output type is Tuple", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic1d, x0: init1d },
      { learning_rate: 0.1, max_iter: 1000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("output Tuple first element is Vector (minimum)", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic1d, x0: init1d },
      { learning_rate: 0.1, max_iter: 1000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    expect(minOut?.type.kind).toBe("Vector");
  });

  test("output Tuple second element is Scalar (objective value)", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic1d, x0: init1d },
      { learning_rate: 0.1, max_iter: 1000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [, valOut] = result.payload as [MathValue, MathValue];
    expect(valOut?.type.kind).toBe("Scalar");
  });

  test("1D x^2 converges to minimum near 0", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic1d, x0: init1d },
      { learning_rate: 0.1, max_iter: 2000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 4);
  });

  test("1D x^2 objective value near 0", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic1d, x0: init1d },
      { learning_rate: 0.1, max_iter: 2000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [, valOut] = result.payload as [MathValue, MathValue];
    expect(valOut?.payload as number).toBeCloseTo(0, 4);
  });

  test("2D x^2+y^2 converges to (0,0)", () => {
    const result = GradientDescentBlock.compute(
      { fn: quadratic2d, x0: init2d },
      { learning_rate: 0.1, max_iter: 2000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 3);
    expect(vals[1]).toBeCloseTo(0, 3);
  });

  test("shifted 1D (x-3)^2 converges to x=3", () => {
    const result = GradientDescentBlock.compute(
      { fn: shiftedQuadratic, x0: initShifted },
      { learning_rate: 0.1, max_iter: 2000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(3, 3);
  });

  test("objective value at converged minimum is f(x*)", () => {
    const result = GradientDescentBlock.compute(
      { fn: shiftedQuadratic, x0: initShifted },
      { learning_rate: 0.1, max_iter: 2000, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [, valOut] = result.payload as [MathValue, MathValue];
    // f(3) = (3-3)^2 = 0
    expect(valOut?.payload as number).toBeCloseTo(0, 4);
  });

  test("throws GradientDescentError when fn missing", () => {
    expect(() => GradientDescentBlock.compute({ x0: init1d }, {}, ctx)).toThrow(
      GradientDescentError,
    );
  });

  test("throws GradientDescentError when x0 missing", () => {
    expect(() => GradientDescentBlock.compute({ fn: quadratic1d }, {}, ctx)).toThrow(
      GradientDescentError,
    );
  });

  test("dimension mismatch between fn variables and x0 throws", () => {
    // fn has 2 variables but x0 has 1 component
    expect(() =>
      GradientDescentBlock.compute(
        { fn: quadratic2d, x0: init1d },
        { learning_rate: 0.1, max_iter: 100, tolerance: 1e-6 },
        ctx,
      ),
    ).toThrow(GradientDescentError);
  });

  test("explain.effect prompts when fn missing", () => {
    const msg = GradientDescentBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });

  test("on convex f: objective value ≤ f(x0)", () => {
    fc.assert(
      fc.property(fc.float({ min: -5, max: 5, noNaN: true }), (x0val) => {
        const x0 = makeVector([x0val]);
        const result = GradientDescentBlock.compute(
          { fn: quadratic1d, x0 },
          { learning_rate: 0.1, max_iter: 1000, tolerance: 1e-8 },
          ctx,
        ) as MathValue;
        const [, valOut] = result.payload as [MathValue, MathValue];
        const finalVal = valOut?.payload as number;
        const initialVal = x0val * x0val;
        expect(finalVal).toBeLessThanOrEqual(initialVal + 1e-6);
      }),
    );
  });
});
