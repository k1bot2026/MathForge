import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { BisectionBlock, BisectionError } from "./bisection";
import { FixedPointBlock, FixedPointError } from "./fixed-point";
import { NewtonRootBlock, NewtonRootError } from "./newton-root";
import { SecantBlock, SecantError } from "./secant";

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

function makeScalar(value: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: value,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// f(x) = x^2 - 2 → root at x = sqrt(2) ≈ 1.41421356
const sqrtFn = makeFunction("x**2 - 2", ["x"]);
// f(x) = x^3 - x - 2 → root at x ≈ 1.52138
const cubicFn = makeFunction("x**3 - x - 2", ["x"]);
// f(x) = cos(x) - x → root at x ≈ 0.73909 (Dottie number)
const cosXFn = makeFunction("cos(x) - x", ["x"]);

describe("opt.bisection", () => {
  test("id is opt.bisection", () => {
    expect(BisectionBlock.id).toBe("opt.bisection");
  });

  test("output type is Scalar", () => {
    const result = BisectionBlock.compute(
      { fn: sqrtFn, a: makeScalar(1), b: makeScalar(2) },
      {},
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("finds sqrt(2) in [1, 2]", () => {
    const result = BisectionBlock.compute(
      { fn: sqrtFn, a: makeScalar(1), b: makeScalar(2) },
      { tolerance: 1e-8, max_iter: 100 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.SQRT2, 6);
  });

  test("cubic root in [1, 2]", () => {
    const result = BisectionBlock.compute(
      { fn: cubicFn, a: makeScalar(1), b: makeScalar(2) },
      { tolerance: 1e-8, max_iter: 100 },
      ctx,
    ) as MathValue;
    const root = result.payload as number;
    // Verify f(root) ≈ 0
    expect(root * root * root - root - 2).toBeCloseTo(0, 5);
  });

  test("throws BisectionError when fn missing", () => {
    expect(() => BisectionBlock.compute({ a: makeScalar(1), b: makeScalar(2) }, {}, ctx)).toThrow(
      BisectionError,
    );
  });

  test("throws BisectionError when brackets don't have opposite signs", () => {
    // f(x) = x^2 - 2 at [2, 3]: f(2)=2>0, f(3)=7>0 — no sign change
    expect(() =>
      BisectionBlock.compute({ fn: sqrtFn, a: makeScalar(2), b: makeScalar(3) }, {}, ctx),
    ).toThrow(BisectionError);
  });
});

describe("opt.newton-root", () => {
  test("id is opt.newton-root", () => {
    expect(NewtonRootBlock.id).toBe("opt.newton-root");
  });

  test("output type is Scalar", () => {
    const result = NewtonRootBlock.compute(
      { fn: sqrtFn, x0: makeScalar(1.5) },
      {},
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("finds sqrt(2) starting near 1.5", () => {
    const result = NewtonRootBlock.compute(
      { fn: sqrtFn, x0: makeScalar(1.5) },
      { tolerance: 1e-10, max_iter: 50 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.SQRT2, 8);
  });

  test("finds root of cos(x)-x", () => {
    const result = NewtonRootBlock.compute(
      { fn: cosXFn, x0: makeScalar(0.5) },
      { tolerance: 1e-10, max_iter: 50 },
      ctx,
    ) as MathValue;
    const root = result.payload as number;
    expect(Math.cos(root) - root).toBeCloseTo(0, 8);
  });

  test("throws NewtonRootError when fn missing", () => {
    expect(() => NewtonRootBlock.compute({ x0: makeScalar(1) }, {}, ctx)).toThrow(NewtonRootError);
  });
});

describe("opt.secant", () => {
  test("id is opt.secant", () => {
    expect(SecantBlock.id).toBe("opt.secant");
  });

  test("output type is Scalar", () => {
    const result = SecantBlock.compute(
      { fn: sqrtFn, x0: makeScalar(1), x1: makeScalar(2) },
      {},
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("finds sqrt(2) with two initial points", () => {
    const result = SecantBlock.compute(
      { fn: sqrtFn, x0: makeScalar(1), x1: makeScalar(2) },
      { tolerance: 1e-10, max_iter: 50 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.SQRT2, 7);
  });

  test("throws SecantError when fn missing", () => {
    expect(() => SecantBlock.compute({ x0: makeScalar(1), x1: makeScalar(2) }, {}, ctx)).toThrow(
      SecantError,
    );
  });
});

describe("opt.fixed-point", () => {
  test("id is opt.fixed-point", () => {
    expect(FixedPointBlock.id).toBe("opt.fixed-point");
  });

  test("output type is Scalar", () => {
    // g(x) = cos(x) — fixed point at Dottie number where cos(x*)=x*
    const g = makeFunction("cos(x)", ["x"]);
    const result = FixedPointBlock.compute({ fn: g, x0: makeScalar(0.5) }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("finds fixed point of cos(x)", () => {
    const g = makeFunction("cos(x)", ["x"]);
    const result = FixedPointBlock.compute(
      { fn: g, x0: makeScalar(0.5) },
      { tolerance: 1e-8, max_iter: 1000 },
      ctx,
    ) as MathValue;
    const xStar = result.payload as number;
    // cos(x*) ≈ x*
    expect(Math.cos(xStar)).toBeCloseTo(xStar, 6);
  });

  test("finds fixed point of x/2 + 1 at x=2", () => {
    // g(x) = x/2 + 1: fixed point at x=2 (contractive on [0, 4])
    const g = makeFunction("x/2 + 1", ["x"]);
    const result = FixedPointBlock.compute(
      { fn: g, x0: makeScalar(0) },
      { tolerance: 1e-8, max_iter: 200 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(2, 6);
  });

  test("throws FixedPointError when fn missing", () => {
    expect(() => FixedPointBlock.compute({ x0: makeScalar(0) }, {}, ctx)).toThrow(FixedPointError);
  });
});
