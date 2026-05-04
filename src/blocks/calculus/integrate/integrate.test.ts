import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeIntegrate, IntegrateError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  integrate: vi.fn(),
}));

async function mockIntegrate(impl: (expr: string, vars: string[], integVar: string) => string) {
  const { integrate } = await import("~/engine/workers/pyodide.client");
  vi.mocked(integrate).mockImplementation((e, v, i) => Promise.resolve(impl(e, v, i)));
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

describe("calc.integrate compute", () => {
  test("returns Function type preserving arity and domain/codomain", async () => {
    await mockIntegrate(() => "-cos(x)");
    const result = await computeIntegrate({ fn: makeFunctionInput("sin(x)") }, {});
    expect(result.type).toEqual({
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    });
  });

  test("payload stores SymPy integrate result", async () => {
    await mockIntegrate(() => "x**3/3");
    const result = await computeIntegrate({ fn: makeFunctionInput("x**2") }, {});
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("x**3/3");
    expect(payload.variables).toEqual(["x"]);
  });

  test("passes expression, variables, and integ variable to worker", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(integrate).mockResolvedValue("x**3/3");
    await computeIntegrate({ fn: makeFunctionInput("x**2") }, { variable: "x" });
    expect(vi.mocked(integrate)).toHaveBeenCalledWith("x**2", ["x"], "x");
  });

  test("infers integ variable from function payload when param is blank", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(integrate).mockResolvedValue("t**3/3");
    await computeIntegrate({ fn: makeFunctionInput("t**2", ["t"]) }, {});
    expect(vi.mocked(integrate)).toHaveBeenCalledWith("t**2", ["t"], "t");
  });

  test("provenance engine is sympy, blockId is calc.integrate", async () => {
    await mockIntegrate(() => "-cos(x)");
    const result = await computeIntegrate({ fn: makeFunctionInput("sin(x)") }, {});
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.integrate");
    expect(result.provenance.inputs).toEqual(["fn"]);
  });

  test("throws IntegrateError when fn input is missing", async () => {
    await expect(computeIntegrate({}, {})).rejects.toThrow(IntegrateError);
    await expect(computeIntegrate({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws IntegrateError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeIntegrate({ fn: scalarInput }, {})).rejects.toThrow(IntegrateError);
  });

  test("throws IntegrateError wrapping worker error", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(integrate).mockRejectedValue(new Error("SymPy internal error"));
    await expect(computeIntegrate({ fn: makeFunctionInput("sin(x)") }, {})).rejects.toThrow(
      IntegrateError,
    );
    await expect(computeIntegrate({ fn: makeFunctionInput("sin(x)") }, {})).rejects.toThrow(
      /SymPy integrate failed/,
    );
  });
});

describe("calc.integrate definition explain", () => {
  test("effect returns integral expression string", async () => {
    const { IntegrateBlock } = await import("./definition");
    const effect = IntegrateBlock.explain.effect;
    if (effect === undefined) throw new Error("effect is undefined");
    const payload: FunctionPayload = { expression: "-cos(x)", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.integrate", inputs: ["fn"], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toBe("∫f(x) dx = -cos(x)");
  });

  test("impact returns antiderivative expression string", async () => {
    const { IntegrateBlock } = await import("./definition");
    const impact = IntegrateBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const payload: FunctionPayload = { expression: "-cos(x)", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.integrate", inputs: ["fn"], computedAt: 0, engine: "sympy" },
    };
    expect(impact({}, output)).toBe("Antiderivative: -cos(x)");
  });

  test("block definition compute delegates to computeIntegrate", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(integrate).mockResolvedValue("-cos(x)");
    const { IntegrateBlock } = await import("./definition");
    const ctx = { signal: new AbortController().signal };
    const result = await IntegrateBlock.compute({ fn: makeFunctionInput("sin(x)") }, {}, ctx);
    expect((result as MathValue).type.kind).toBe("Function");
  });
});
