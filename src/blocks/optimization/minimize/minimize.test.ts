import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { MinimizeBlock, MinimizeError } from "./definition";

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

const quad = makeFunction("x**2", ["x"]);

describe("opt.minimize", () => {
  test("id is opt.minimize", () => {
    expect(MinimizeBlock.id).toBe("opt.minimize");
  });

  test("gradient-descent method converges on x^2", () => {
    const result = MinimizeBlock.compute(
      { fn: quad, x0: makeVector([3]) },
      { method: "gradient-descent" },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 3);
  });

  test("newton method converges on x^2", () => {
    const result = MinimizeBlock.compute(
      { fn: quad, x0: makeVector([3]) },
      { method: "newton" },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 5);
  });

  test("bfgs method converges on x^2", () => {
    const result = MinimizeBlock.compute(
      { fn: quad, x0: makeVector([3]) },
      { method: "bfgs" },
      ctx,
    ) as MathValue;
    const [minOut] = result.payload as [MathValue];
    const vals = minOut?.payload as number[];
    expect(vals[0]).toBeCloseTo(0, 4);
  });

  test("default method is bfgs", () => {
    const result = MinimizeBlock.compute({ fn: quad, x0: makeVector([3]) }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("output is Tuple<Vector, Scalar>", () => {
    const result = MinimizeBlock.compute(
      { fn: quad, x0: makeVector([3]) },
      { method: "bfgs" },
      ctx,
    ) as MathValue;
    const [minOut, valOut] = result.payload as [MathValue, MathValue];
    expect(minOut?.type.kind).toBe("Vector");
    expect(valOut?.type.kind).toBe("Scalar");
  });

  test("throws MinimizeError when fn missing", () => {
    expect(() => MinimizeBlock.compute({ x0: makeVector([0]) }, {}, ctx)).toThrow(MinimizeError);
  });

  test("throws MinimizeError when x0 missing", () => {
    expect(() => MinimizeBlock.compute({ fn: quad }, {}, ctx)).toThrow(MinimizeError);
  });

  test("explain.effect prompts when inputs missing", () => {
    const msg = MinimizeBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });
});
