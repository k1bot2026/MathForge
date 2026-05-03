import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeDerivative, DerivativeError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
}));

async function mockDiff(impl: (expr: string, vars: string[], diffVar: string) => string) {
  const { diff } = await import("~/engine/workers/pyodide.client");
  vi.mocked(diff).mockImplementation((e, v, d) => Promise.resolve(impl(e, v, d)));
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

describe("calc.derivative compute", () => {
  test("returns Function type preserving arity and domain/codomain", async () => {
    await mockDiff(() => "cos(x)");
    const result = await computeDerivative({ fn: makeFunctionInput("sin(x)") }, {});
    expect(result.type).toEqual({
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    });
  });

  test("payload stores SymPy diff result", async () => {
    await mockDiff(() => "2*x");
    const result = await computeDerivative({ fn: makeFunctionInput("x**2") }, {});
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("2*x");
    expect(payload.variables).toEqual(["x"]);
  });

  test("passes expression, variables, and diff variable to worker", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2*x");
    await computeDerivative({ fn: makeFunctionInput("x**2") }, { variable: "x" });
    expect(vi.mocked(diff)).toHaveBeenCalledWith("x**2", ["x"], "x");
  });

  test("infers diff variable from function payload when param is blank", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2*t");
    await computeDerivative({ fn: makeFunctionInput("t**2", ["t"]) }, {});
    expect(vi.mocked(diff)).toHaveBeenCalledWith("t**2", ["t"], "t");
  });

  test("param variable overrides inferred variable", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("1");
    await computeDerivative({ fn: makeFunctionInput("x*y", ["x", "y"]) }, { variable: "y" });
    expect(vi.mocked(diff)).toHaveBeenCalledWith("x*y", ["x", "y"], "y");
  });

  test("provenance engine is sympy, blockId is calc.derivative", async () => {
    await mockDiff(() => "cos(x)");
    const result = await computeDerivative({ fn: makeFunctionInput("sin(x)") }, {});
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.derivative");
    expect(result.provenance.inputs).toEqual(["fn"]);
  });

  test("throws DerivativeError when fn input is missing", async () => {
    await expect(computeDerivative({}, {})).rejects.toThrow(DerivativeError);
    await expect(computeDerivative({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws DerivativeError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeDerivative({ fn: scalarInput }, {})).rejects.toThrow(DerivativeError);
  });

  test("throws DerivativeError wrapping worker error", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockRejectedValue(new Error("SymPy internal error"));
    await expect(computeDerivative({ fn: makeFunctionInput("sin(x)") }, {})).rejects.toThrow(
      DerivativeError,
    );
    await expect(computeDerivative({ fn: makeFunctionInput("sin(x)") }, {})).rejects.toThrow(
      /SymPy diff failed/,
    );
  });
});

describe("calc.derivative definition explain", () => {
  test("effect returns derivative expression string", async () => {
    const { DerivativeBlock } = await import("./definition");
    const effect = DerivativeBlock.explain.effect;
    if (effect === undefined) throw new Error("effect is undefined");
    const payload: FunctionPayload = { expression: "cos(x)", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.derivative", inputs: ["fn"], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toBe("f'(x) = cos(x)");
  });
});
