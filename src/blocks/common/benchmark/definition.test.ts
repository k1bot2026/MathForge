import { describe, expect, test } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { BenchmarkError, runBenchmark } from "./compute";
import { BenchmarkBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

// A simple single-variable function value for testing
function makeFn(expression: string, variables: string[] = ["x"]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
  };
}

function scalarValue(n: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: n,
    provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Wall-clock threshold: 200 ms for 10 mathjs evaluations of "x**2 + 1" is very generous.
// This is a 100× safety margin — a typical run is < 1 ms.
const THRESHOLD_MS = 200;

describe("BenchmarkBlock definition", () => {
  test("has id core.benchmark", () => {
    expect(BenchmarkBlock.id).toBe("core.benchmark");
  });

  test("has one fn input and one ms_per_call output", () => {
    expect(BenchmarkBlock.inputs[0]?.id).toBe("fn");
    expect(BenchmarkBlock.outputs[0]?.id).toBe("ms_per_call");
  });

  test("output type is Scalar real approximate", () => {
    expect(BenchmarkBlock.outputs[0]?.type).toEqual({
      kind: "Scalar",
      field: "real",
      precision: "approximate",
    });
  });

  test("x input is optional", () => {
    const xPort = BenchmarkBlock.inputs.find((p) => p.id === "x");
    expect(xPort?.required).toBe(false);
  });

  test("has samples and warmup params with correct defaults", () => {
    expect(BenchmarkBlock.params?.samples?.default).toBe(10);
    expect(BenchmarkBlock.params?.warmup?.default).toBe(2);
  });
});

describe("BenchmarkBlock compute", () => {
  test("returns a non-negative Scalar when fn is connected", () => {
    const result = BenchmarkBlock.compute(
      { fn: makeFn("x**2 + 1") },
      { samples: 5, warmup: 1 },
      ctx,
    ) as MathValue;
    expect(result.type.kind).toBe("Scalar");
    expect(typeof result.payload).toBe("number");
    expect(result.payload as number).toBeGreaterThanOrEqual(0);
  });

  test("result is under generous wallclock threshold (OS-jitter tolerant)", () => {
    const result = BenchmarkBlock.compute(
      { fn: makeFn("x**2 + 1") },
      { samples: 10, warmup: 2 },
      ctx,
    ) as MathValue;
    // ms_per_call for a trivial expression should be well under THRESHOLD_MS
    expect(result.payload as number).toBeLessThan(THRESHOLD_MS);
  });

  test("uses x eval point when provided", () => {
    // Should not throw regardless of eval point
    const result = BenchmarkBlock.compute(
      { fn: makeFn("x**2"), x: scalarValue(3) },
      { samples: 3, warmup: 1 },
      ctx,
    ) as MathValue;
    expect(typeof result.payload).toBe("number");
  });

  test("defaults to x=0 when x input is absent", () => {
    // sin(x) at x=0 = 0 — shouldn't affect timing, just verifying no error
    const result = BenchmarkBlock.compute(
      { fn: makeFn("sin(x)") },
      { samples: 3, warmup: 1 },
      ctx,
    ) as MathValue;
    expect(typeof result.payload).toBe("number");
  });

  test("throws BenchmarkError when fn input is missing", () => {
    expect(() => BenchmarkBlock.compute({}, { samples: 5, warmup: 1 }, ctx)).toThrow(
      BenchmarkError,
    );
  });

  test("throws BenchmarkError when fn input is not a Function kind", () => {
    expect(() =>
      BenchmarkBlock.compute({ fn: scalarValue(42) }, { samples: 5, warmup: 1 }, ctx),
    ).toThrow(BenchmarkError);
  });
});

describe("runBenchmark", () => {
  const simpleFn: FunctionPayload = { expression: "x + 1", variables: ["x"] };

  test("throws when samples < 1", () => {
    expect(() => runBenchmark(simpleFn, 0, 0, 2)).toThrow(BenchmarkError);
  });

  test("throws when warmup < 0", () => {
    expect(() => runBenchmark(simpleFn, 0, 5, -1)).toThrow(BenchmarkError);
  });

  test("returns non-negative ms for samples=1 warmup=0", () => {
    const ms = runBenchmark(simpleFn, 0, 1, 0);
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  test("warmup=10 completes without error", () => {
    const ms = runBenchmark(simpleFn, 1, 5, 10);
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  test("result is under generous wallclock threshold", () => {
    const ms = runBenchmark(simpleFn, 0, 20, 5);
    // 20 evaluations of "x + 1" should finish in under THRESHOLD_MS total,
    // so mean per-call is far under THRESHOLD_MS / 20
    expect(ms).toBeLessThan(THRESHOLD_MS);
  });
});

describe("BenchmarkBlock explain", () => {
  test("effect shows ms per call with 4 decimal places", () => {
    const fakeOutput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0.0123,
      provenance: { blockId: "core.benchmark", inputs: [], computedAt: 0, engine: "native" },
    };
    const msg = BenchmarkBlock.explain.effect?.({}, fakeOutput);
    expect(msg).toMatch(/ms per call/);
    expect(msg).toMatch(/0\.0123/);
  });
});
