import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { BfgsBlock, BfgsError } from "./definition";

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

const quad1d = makeFunction("x**2", ["x"]);
const quad2d = makeFunction("x**2 + y**2", ["x", "y"]);
// Rosenbrock-like: (x-2)^2 + 2*(y-1)^2 — min at (2, 1)
const bowl = makeFunction("(x - 2)**2 + 2*(y - 1)**2", ["x", "y"]);

describe("opt.bfgs", () => {
  test("id is opt.bfgs", () => {
    expect(BfgsBlock.id).toBe("opt.bfgs");
  });

  test("output type is Tuple", () => {
    const result = BfgsBlock.compute(
      { fn: quad1d, x0: makeVector([3]) },
      { max_iter: 200, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("1D x^2 converges to 0", () => {
    const result = BfgsBlock.compute(
      { fn: quad1d, x0: makeVector([3]) },
      { max_iter: 200, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 4);
  });

  test("2D x^2+y^2 converges to (0,0)", () => {
    const result = BfgsBlock.compute(
      { fn: quad2d, x0: makeVector([2, 2]) },
      { max_iter: 200, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 4);
    expect(vals[1]).toBeCloseTo(0, 4);
  });

  test("bowl function converges to (2, 1)", () => {
    const result = BfgsBlock.compute(
      { fn: bowl, x0: makeVector([0, 0]) },
      { max_iter: 200, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(2, 3);
    expect(vals[1]).toBeCloseTo(1, 3);
  });

  test("objective value near 0 at minimum of x^2", () => {
    const result = BfgsBlock.compute(
      { fn: quad1d, x0: makeVector([3]) },
      { max_iter: 200, tolerance: 1e-8 },
      ctx,
    ) as MathValue;
    const [, valOut] = result.payload as [MathValue, MathValue];
    expect(valOut?.payload as number).toBeCloseTo(0, 4);
  });

  test("throws BfgsError when fn missing", () => {
    expect(() => BfgsBlock.compute({ x0: makeVector([0]) }, {}, ctx)).toThrow(BfgsError);
  });

  test("throws BfgsError when x0 missing", () => {
    expect(() => BfgsBlock.compute({ fn: quad1d }, {}, ctx)).toThrow(BfgsError);
  });

  test("explain.effect prompts when inputs missing", () => {
    const msg = BfgsBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });
});
