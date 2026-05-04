import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeFunction, FunctionError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  sympify: vi.fn(),
}));

async function mockSympify(impl: (expr: string, vars: string[]) => string) {
  const { sympify } = await import("~/engine/workers/pyodide.client");
  vi.mocked(sympify).mockImplementation((e, v) => Promise.resolve(impl(e, v)));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("calc.function compute", () => {
  test("returns Function(arity=1, domain=Scalar, codomain=Scalar) type", async () => {
    await mockSympify(() => "sin(x)");
    const result = await computeFunction({}, { expression: "sin(x)", variable: "x" });
    expect(result.type).toEqual({
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    });
  });

  test("payload stores canonical SymPy expression and variable", async () => {
    await mockSympify(() => "x**2 + sin(x)");
    const result = await computeFunction({}, { expression: "x^2 + sin(x)", variable: "x" });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("x**2 + sin(x)");
    expect(payload.variables).toEqual(["x"]);
  });

  test("uses default variable x when variable param is absent", async () => {
    await mockSympify(() => "cos(x)");
    const result = await computeFunction({}, { expression: "cos(x)" });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.variables).toEqual(["x"]);
  });

  test("passes expression and variable to sympify", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("t**2");
    await computeFunction({}, { expression: "t**2", variable: "t" });
    expect(vi.mocked(sympify)).toHaveBeenCalledWith("t**2", ["t"]);
  });

  test("trims whitespace from expression and variable params", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("sin(x)");
    await computeFunction({}, { expression: "  sin(x)  ", variable: "  x  " });
    expect(vi.mocked(sympify)).toHaveBeenCalledWith("sin(x)", ["x"]);
  });

  test("provenance engine is sympy, blockId is calc.function", async () => {
    await mockSympify(() => "exp(x)");
    const result = await computeFunction({}, { expression: "exp(x)", variable: "x" });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.function");
    expect(result.provenance.inputs).toEqual([]);
  });

  test("throws FunctionError when expression param is missing", async () => {
    await expect(computeFunction({}, {})).rejects.toThrow(FunctionError);
    await expect(computeFunction({}, {})).rejects.toThrow(
      "calc.function requires a non-empty expression",
    );
  });

  test("throws FunctionError when expression param is empty string", async () => {
    await expect(computeFunction({}, { expression: "  " })).rejects.toThrow(FunctionError);
  });

  test("throws FunctionError when variable param is empty string", async () => {
    await expect(computeFunction({}, { expression: "sin(x)", variable: "" })).rejects.toThrow(
      FunctionError,
    );
    await expect(computeFunction({}, { expression: "sin(x)", variable: "" })).rejects.toThrow(
      "calc.function requires a non-empty variable name",
    );
  });

  test("throws FunctionError wrapping sympify error", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockRejectedValue(new Error("SyntaxError: invalid expression"));
    await expect(computeFunction({}, { expression: "sin(((x", variable: "x" })).rejects.toThrow(
      FunctionError,
    );
    await expect(computeFunction({}, { expression: "sin(((x", variable: "x" })).rejects.toThrow(
      /Invalid expression/,
    );
  });
});

describe("calc.function definition explain", () => {
  test("effect returns canonical form string", async () => {
    const { FunctionBlock } = await import("./definition");
    const effect = FunctionBlock.explain.effect;
    if (effect === undefined) throw new Error("effect is undefined");
    const payload: FunctionPayload = { expression: "sin(x)", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toBe("f(x) = sin(x)");
  });

  test("impact returns canonical SymPy form and variable", async () => {
    const { FunctionBlock } = await import("./definition");
    const impact = FunctionBlock.explain.impact;
    if (impact === undefined) throw new Error("impact is undefined");
    const payload: FunctionPayload = { expression: "x**2", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.function", inputs: [], computedAt: 0, engine: "sympy" },
    };
    const msg = impact({}, output);
    expect(msg).toMatch(/x\*\*2/);
    expect(msg).toMatch(/Variable: x/);
  });
});
