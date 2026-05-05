import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { LineSearchBlock, LineSearchError } from "./definition";

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

// f(x) = x^2, at x=3 (gradient = 6, direction = -6 i.e. negative gradient)
const quadratic = makeFunction("x**2", ["x"]);

describe("opt.line-search", () => {
  test("id is opt.line-search", () => {
    expect(LineSearchBlock.id).toBe("opt.line-search");
  });

  test("output type is Scalar (step size α)", () => {
    const x = makeVector([3]);
    const direction = makeVector([-6]); // negative gradient direction
    const result = LineSearchBlock.compute({ fn: quadratic, x, direction }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("returns positive step size", () => {
    const x = makeVector([3]);
    const direction = makeVector([-6]);
    const result = LineSearchBlock.compute({ fn: quadratic, x, direction }, {}, ctx) as MathValue;
    const alpha = result.payload as number;
    expect(alpha).toBeGreaterThan(0);
  });

  test("step satisfies sufficient decrease (Armijo condition)", () => {
    // Armijo: f(x + α*d) ≤ f(x) + c1 * α * ∇f(x)·d
    // For x=3, f=9, ∇f=6, d=-6: ∇f·d = -36
    const x = makeVector([3]);
    const direction = makeVector([-6]);
    const result = LineSearchBlock.compute({ fn: quadratic, x, direction }, {}, ctx) as MathValue;
    const alpha = result.payload as number;

    // x_new = 3 + alpha * (-6)
    const xNew = 3 + alpha * -6;
    const fNew = xNew * xNew;
    const fOld = 9;
    const c1 = 1e-4;
    const gradDotDir = 6 * -6; // ∇f·d = -36
    expect(fNew).toBeLessThanOrEqual(fOld + c1 * alpha * gradDotDir + 1e-10);
  });

  test("throws LineSearchError when fn missing", () => {
    const x = makeVector([3]);
    const direction = makeVector([-6]);
    expect(() => LineSearchBlock.compute({ x, direction }, {}, ctx)).toThrow(LineSearchError);
  });

  test("throws LineSearchError when x missing", () => {
    const direction = makeVector([-6]);
    expect(() => LineSearchBlock.compute({ fn: quadratic, direction }, {}, ctx)).toThrow(
      LineSearchError,
    );
  });

  test("throws LineSearchError when direction missing", () => {
    const x = makeVector([3]);
    expect(() => LineSearchBlock.compute({ fn: quadratic, x }, {}, ctx)).toThrow(LineSearchError);
  });

  test("explain.effect prompts when inputs missing", () => {
    const msg = LineSearchBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });

  test("2D case returns positive alpha", () => {
    const f2d = makeFunction("x**2 + y**2", ["x", "y"]);
    const x = makeVector([2, 2]);
    const direction = makeVector([-4, -4]); // negative gradient at (2,2)
    const result = LineSearchBlock.compute({ fn: f2d, x, direction }, {}, ctx) as MathValue;
    const alpha = result.payload as number;
    expect(alpha).toBeGreaterThan(0);
  });
});
