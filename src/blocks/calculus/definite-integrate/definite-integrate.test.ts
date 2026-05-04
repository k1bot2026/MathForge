import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeDefiniteIntegrate, DefiniteIntegrateError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  definiteIntegrate: vi.fn(),
}));

async function mockDefiniteIntegrate(
  impl: (expr: string, vars: string[], integVar: string, a: number, b: number) => number,
) {
  const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
  vi.mocked(definiteIntegrate).mockImplementation((e, v, i, a, b) =>
    Promise.resolve(impl(e, v, i, a, b)),
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

function makeFunctionInput(expression: string, variables: string[] = ["x"]): MathValue {
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

function makeScalarInput(value: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: value,
    provenance: { blockId: "some.scalar", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("calc.definite-integrate compute", () => {
  test("returns Scalar(real, approximate) type", async () => {
    await mockDefiniteIntegrate(() => 2.0);
    const result = await computeDefiniteIntegrate(
      { fn: makeFunctionInput("sin(x)") },
      { a: 0, b: Math.PI },
    );
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
  });

  test("payload is the numeric result from worker", async () => {
    await mockDefiniteIntegrate(() => 0.333);
    const result = await computeDefiniteIntegrate(
      { fn: makeFunctionInput("x**2") },
      { a: 0, b: 1 },
    );
    expect(result.payload).toBe(0.333);
  });

  test("passes expression, variables, integVar, a, b to worker", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(1.0);
    await computeDefiniteIntegrate({ fn: makeFunctionInput("x**2") }, { a: 0, b: 1 });
    expect(vi.mocked(definiteIntegrate)).toHaveBeenCalledWith("x**2", ["x"], "x", 0, 1);
  });

  test("bound inputs override param defaults", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(5.0);
    await computeDefiniteIntegrate(
      {
        fn: makeFunctionInput("x**2"),
        a: makeScalarInput(-1),
        b: makeScalarInput(2),
      },
      { a: 0, b: 1 },
    );
    expect(vi.mocked(definiteIntegrate)).toHaveBeenCalledWith("x**2", ["x"], "x", -1, 2);
  });

  test("infers variable from payload when variable param is blank", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(3.0);
    await computeDefiniteIntegrate({ fn: makeFunctionInput("t**2", ["t"]) }, { a: 0, b: 3 });
    expect(vi.mocked(definiteIntegrate)).toHaveBeenCalledWith("t**2", ["t"], "t", 0, 3);
  });

  test("provenance engine is sympy, blockId is calc.definite-integrate", async () => {
    await mockDefiniteIntegrate(() => 2.0);
    const result = await computeDefiniteIntegrate(
      { fn: makeFunctionInput("sin(x)") },
      { a: 0, b: Math.PI },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.definite-integrate");
  });

  test("throws DefiniteIntegrateError when fn input is missing", async () => {
    await expect(computeDefiniteIntegrate({}, {})).rejects.toThrow(DefiniteIntegrateError);
    await expect(computeDefiniteIntegrate({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws DefiniteIntegrateError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeDefiniteIntegrate({ fn: scalarInput }, {})).rejects.toThrow(
      DefiniteIntegrateError,
    );
  });

  test("throws DefiniteIntegrateError wrapping worker error", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockRejectedValue(new Error("SymPy internal error"));
    await expect(
      computeDefiniteIntegrate({ fn: makeFunctionInput("sin(x)") }, { a: 0, b: 1 }),
    ).rejects.toThrow(DefiniteIntegrateError);
    await expect(
      computeDefiniteIntegrate({ fn: makeFunctionInput("sin(x)") }, { a: 0, b: 1 }),
    ).rejects.toThrow(/SymPy definite integrate failed/);
  });
});

describe("calc.definite-integrate definition explain", () => {
  test("effect returns numeric result with 6 significant figures", async () => {
    const { DefiniteIntegrateBlock } = await import("./definition");
    const effect = DefiniteIntegrateBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 1.23456789,
      provenance: {
        blockId: "calc.definite-integrate",
        inputs: [],
        computedAt: 0,
        engine: "sympy",
      },
    };
    expect(effect({}, output)).toMatch(/1\.23457/);
  });

  test("impact returns Result string with payload", async () => {
    const { DefiniteIntegrateBlock } = await import("./definition");
    const impact = DefiniteIntegrateBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 2,
      provenance: {
        blockId: "calc.definite-integrate",
        inputs: [],
        computedAt: 0,
        engine: "sympy",
      },
    };
    expect(impact({}, output)).toBe("Result: 2");
  });
});
