import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { computeGradient, GradientError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function makeFunctionInput(expression: string, variables: string[]): MathValue {
  const payload: FunctionPayload = { expression, variables };
  return {
    type: {
      kind: "Function",
      arity: variables.length,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: payload as unknown as number,
    provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
  };
}

describe("calc.gradient compute", () => {
  test("returns Vector(n, real) type for n-variable function", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("2*x").mockResolvedValueOnce("2*y");
    const result = await computeGradient({ fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) }, {});
    expect(result.type).toEqual({ kind: "Vector", n: 2, field: "real" });
  });

  test("calls diff for each variable in order", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("2*x").mockResolvedValueOnce("2*y");
    await computeGradient({ fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) }, {});
    expect(vi.mocked(diff)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(diff)).toHaveBeenCalledWith("x**2 + y**2", ["x", "y"], "x");
    expect(vi.mocked(diff)).toHaveBeenCalledWith("x**2 + y**2", ["x", "y"], "y");
  });

  test("numeric partial results become vector components", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("2").mockResolvedValueOnce("3");
    const result = await computeGradient({ fn: makeFunctionInput("2*x + 3*y", ["x", "y"]) }, {});
    expect(result.payload).toEqual([2, 3]);
  });

  test("non-numeric partial results become NaN in the vector", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("2*x").mockResolvedValueOnce("3*y");
    const result = await computeGradient(
      { fn: makeFunctionInput("x**2 + 3*y**2/2", ["x", "y"]) },
      {},
    );
    const components = result.payload as unknown as VectorPayload;
    expect(Number.isNaN(components[0])).toBe(true);
    expect(Number.isNaN(components[1])).toBe(true);
  });

  test("single-variable function produces Vector<1>", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("cos(x)");
    const result = await computeGradient({ fn: makeFunctionInput("sin(x)", ["x"]) }, {});
    expect(result.type).toEqual({ kind: "Vector", n: 1, field: "real" });
  });

  test("provenance engine is sympy, blockId is calc.gradient", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("1");
    const result = await computeGradient({ fn: makeFunctionInput("x + y", ["x", "y"]) }, {});
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.gradient");
  });

  test("throws GradientError when fn input is missing", async () => {
    await expect(computeGradient({}, {})).rejects.toThrow(GradientError);
    await expect(computeGradient({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws GradientError when input is not Function kind", async () => {
    const scalar: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 1,
      provenance: { blockId: "x", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeGradient({ fn: scalar }, {})).rejects.toThrow(GradientError);
  });

  test("throws GradientError for zero-variable function", async () => {
    await expect(computeGradient({ fn: makeFunctionInput("42", []) }, {})).rejects.toThrow(
      GradientError,
    );
    await expect(computeGradient({ fn: makeFunctionInput("42", []) }, {})).rejects.toThrow(
      "at least one variable",
    );
  });

  test("throws GradientError wrapping worker error", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockRejectedValue(new Error("SymPy error"));
    await expect(
      computeGradient({ fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) }, {}),
    ).rejects.toThrow(GradientError);
    await expect(
      computeGradient({ fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) }, {}),
    ).rejects.toThrow(/SymPy gradient computation failed/);
  });
});

describe("calc.gradient definition explain", () => {
  test("effect returns connect prompt when fn input is missing", async () => {
    const { GradientBlock } = await import("./definition");
    const effect = GradientBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const output: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [2, 6] as unknown as VectorPayload,
      provenance: { blockId: "calc.gradient", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toMatch(/Connect/);
  });

  test("effect returns formatted gradient vector when fn is connected", async () => {
    const { GradientBlock } = await import("./definition");
    const effect = GradientBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const fnPayload: FunctionPayload = { expression: "x**2 + 3*y", variables: ["x", "y"] };
    const fnInput: MathValue = {
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: fnPayload as unknown as number,
      provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
    };
    const output: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [2, 3] as unknown as VectorPayload,
      provenance: { blockId: "calc.gradient", inputs: [], computedAt: 0, engine: "sympy" },
    };
    const msg = effect({ fn: fnInput }, output);
    expect(msg).toMatch(/∇f\(x, y\)/);
    expect(msg).toMatch(/2\.000/);
    expect(msg).toMatch(/3\.000/);
  });
});
