import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { GaussQuadratureBlock, GaussQuadratureError } from "./gauss-quadrature";
import { SimpsonBlock, SimpsonError } from "./simpson";
import { TrapezoidBlock, TrapezoidError } from "./trapezoid";

const ctx = { signal: new AbortController().signal };

function makeFunction(expression: string, variables: string[]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: 1,
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

// Known integrals:
// ∫₀¹ x dx = 0.5
// ∫₀^π sin(x) dx = 2
// ∫₀¹ x² dx = 1/3
// ∫₀¹ exp(x) dx = e - 1 ≈ 1.71828

const linFn = makeFunction("x", ["x"]); // ∫₀¹ x dx = 0.5
const sinFn = makeFunction("sin(x)", ["x"]); // ∫₀^π sin(x) dx = 2
const sqFn = makeFunction("x**2", ["x"]); // ∫₀¹ x² dx = 1/3
const expFn = makeFunction("exp(x)", ["x"]); // ∫₀¹ exp(x) dx = e-1

const a0 = makeScalar(0);
const a1 = makeScalar(1);
const aPi = makeScalar(0);
const bPi = makeScalar(Math.PI);

describe("opt.trapezoid", () => {
  test("id is opt.trapezoid", () => {
    expect(TrapezoidBlock.id).toBe("opt.trapezoid");
  });

  test("output type is Scalar", () => {
    const result = TrapezoidBlock.compute(
      { fn: linFn, a: a0, b: a1 },
      { n: 100 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("∫₀¹ x dx = 0.5", () => {
    const result = TrapezoidBlock.compute(
      { fn: linFn, a: a0, b: a1 },
      { n: 1000 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(0.5, 6);
  });

  test("∫₀^π sin(x) dx ≈ 2", () => {
    const result = TrapezoidBlock.compute(
      { fn: sinFn, a: aPi, b: bPi },
      { n: 10000 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(2, 5);
  });

  test("∫₀¹ x² dx ≈ 1/3", () => {
    const result = TrapezoidBlock.compute(
      { fn: sqFn, a: a0, b: a1 },
      { n: 1000 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(1 / 3, 5);
  });

  test("∫₀¹ exp(x) dx ≈ e-1", () => {
    const result = TrapezoidBlock.compute(
      { fn: expFn, a: a0, b: a1 },
      { n: 1000 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.E - 1, 5);
  });

  test("throws TrapezoidError when fn missing", () => {
    expect(() => TrapezoidBlock.compute({ a: a0, b: a1 }, {}, ctx)).toThrow(TrapezoidError);
  });

  test("throws TrapezoidError when a missing", () => {
    expect(() => TrapezoidBlock.compute({ fn: linFn, b: a1 }, {}, ctx)).toThrow(TrapezoidError);
  });
});

describe("opt.simpson", () => {
  test("id is opt.simpson", () => {
    expect(SimpsonBlock.id).toBe("opt.simpson");
  });

  test("output type is Scalar", () => {
    const result = SimpsonBlock.compute({ fn: linFn, a: a0, b: a1 }, { n: 100 }, ctx) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("∫₀¹ x dx = 0.5 (exact for polynomials)", () => {
    const result = SimpsonBlock.compute({ fn: linFn, a: a0, b: a1 }, { n: 4 }, ctx) as MathValue;
    expect(result.payload as number).toBeCloseTo(0.5, 10);
  });

  test("∫₀^π sin(x) dx ≈ 2 (better than trapezoid at same n)", () => {
    const result = SimpsonBlock.compute(
      { fn: sinFn, a: aPi, b: bPi },
      { n: 100 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(2, 6);
  });

  test("∫₀¹ x² dx = 1/3 exactly (Simpson exact for degree-3)", () => {
    const result = SimpsonBlock.compute({ fn: sqFn, a: a0, b: a1 }, { n: 2 }, ctx) as MathValue;
    expect(result.payload as number).toBeCloseTo(1 / 3, 10);
  });

  test("∫₀¹ exp(x) dx ≈ e-1", () => {
    const result = SimpsonBlock.compute({ fn: expFn, a: a0, b: a1 }, { n: 100 }, ctx) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.E - 1, 8);
  });

  test("throws SimpsonError when fn missing", () => {
    expect(() => SimpsonBlock.compute({ a: a0, b: a1 }, {}, ctx)).toThrow(SimpsonError);
  });

  test("throws SimpsonError when b missing", () => {
    expect(() => SimpsonBlock.compute({ fn: linFn, a: a0 }, {}, ctx)).toThrow(SimpsonError);
  });
});

describe("opt.gauss-quadrature", () => {
  test("id is opt.gauss-quadrature", () => {
    expect(GaussQuadratureBlock.id).toBe("opt.gauss-quadrature");
  });

  test("output type is Scalar", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: linFn, a: a0, b: a1 },
      { order: 5 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
  });

  test("∫₀¹ x dx = 0.5 exactly (GL order 2 exact for polynomials degree ≤ 3)", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: linFn, a: a0, b: a1 },
      { order: 2 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(0.5, 12);
  });

  test("∫₀¹ x² dx = 1/3 (GL order 2 exact for degree ≤ 3)", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: sqFn, a: a0, b: a1 },
      { order: 2 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(1 / 3, 12);
  });

  test("∫₀^π sin(x) dx ≈ 2 (GL order 5)", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: sinFn, a: aPi, b: bPi },
      { order: 5 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(2, 5);
  });

  test("∫₀¹ exp(x) dx ≈ e-1 (GL order 5)", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: expFn, a: a0, b: a1 },
      { order: 5 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.E - 1, 10);
  });

  test("GL order 10 achieves near-machine precision on exp", () => {
    const result = GaussQuadratureBlock.compute(
      { fn: expFn, a: a0, b: a1 },
      { order: 10 },
      ctx,
    ) as MathValue;
    expect(result.payload as number).toBeCloseTo(Math.E - 1, 13);
  });

  test("throws GaussQuadratureError when fn missing", () => {
    expect(() => GaussQuadratureBlock.compute({ a: a0, b: a1 }, {}, ctx)).toThrow(
      GaussQuadratureError,
    );
  });

  test("throws GaussQuadratureError when a missing", () => {
    expect(() => GaussQuadratureBlock.compute({ fn: linFn, b: a1 }, {}, ctx)).toThrow(
      GaussQuadratureError,
    );
  });
});
