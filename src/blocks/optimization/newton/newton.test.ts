import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { NewtonOptBlock, NewtonOptError } from "./definition";

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

// f(x) = x^2 — minimum at x=0
const quad1d = makeFunction("x**2", ["x"]);
// f(x, y) = x^2 + 4*y^2 — minimum at (0,0)
const quad2d = makeFunction("x**2 + 4*y**2", ["x", "y"]);
// f(x) = (x-5)^2 — minimum at x=5
const shifted = makeFunction("(x - 5)**2", ["x"]);

describe("opt.newton", () => {
  test("id is opt.newton", () => {
    expect(NewtonOptBlock.id).toBe("opt.newton");
  });

  test("output type is Tuple", () => {
    const result = NewtonOptBlock.compute(
      { fn: quad1d, x0: makeVector([3]) },
      { max_iter: 50, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("1D x^2 converges to 0 in very few iterations", () => {
    const result = NewtonOptBlock.compute(
      { fn: quad1d, x0: makeVector([3]) },
      { max_iter: 50, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 6);
  });

  test("2D quadratic converges to (0,0)", () => {
    const result = NewtonOptBlock.compute(
      { fn: quad2d, x0: makeVector([3, 3]) },
      { max_iter: 50, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 5);
    expect(vals[1]).toBeCloseTo(0, 5);
  });

  test("shifted 1D converges to x=5", () => {
    const result = NewtonOptBlock.compute(
      { fn: shifted, x0: makeVector([0]) },
      { max_iter: 50, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(5, 5);
  });

  test("objective value near 0 at minimum of x^2", () => {
    const result = NewtonOptBlock.compute(
      { fn: quad1d, x0: makeVector([4]) },
      { max_iter: 50, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [, valOut] = result.payload as [MathValue, MathValue];
    expect(valOut?.payload as number).toBeCloseTo(0, 6);
  });

  test("throws NewtonOptError when fn missing", () => {
    expect(() => NewtonOptBlock.compute({ x0: makeVector([0]) }, {}, ctx)).toThrow(NewtonOptError);
  });

  test("throws NewtonOptError when x0 missing", () => {
    expect(() => NewtonOptBlock.compute({ fn: quad1d }, {}, ctx)).toThrow(NewtonOptError);
  });

  test("explain.effect prompts when inputs missing", () => {
    const msg = NewtonOptBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });
});
