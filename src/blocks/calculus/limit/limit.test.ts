import { afterEach, describe, expect, test, vi } from "vitest";
import type { ExpressionPayload, FunctionPayload, MathValue } from "~/math/types";
import { computeLimit, LimitError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  limit: vi.fn(),
}));

async function mockLimit(
  impl: (expr: string, vars: string[], limitVar: string, point: number | string) => string,
) {
  const { limit } = await import("~/engine/workers/pyodide.client");
  vi.mocked(limit).mockImplementation((e, v, l, p) => Promise.resolve(impl(e, v, l, p)));
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

describe("calc.limit compute", () => {
  test("returns Scalar type when result is numeric", async () => {
    await mockLimit(() => "1");
    const result = await computeLimit({ fn: makeFunctionInput("sin(x)/x") }, { point: 0 });
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
    expect(result.payload).toBe(1);
  });

  test("returns Expression type for symbolic result (oo)", async () => {
    await mockLimit(() => "oo");
    const result = await computeLimit({ fn: makeFunctionInput("1/x") }, { point: 0 });
    expect(result.type).toEqual({ kind: "Expression", freeVars: [] });
    const payload = result.payload as unknown as ExpressionPayload;
    expect(payload.serialized).toBe("oo");
    expect(payload.form).toBe("sympy");
  });

  test("passes expression, variables, limitVar, and point to worker", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("1");
    await computeLimit({ fn: makeFunctionInput("sin(x)/x") }, { point: 0 });
    expect(vi.mocked(limit)).toHaveBeenCalledWith("sin(x)/x", ["x"], "x", 0);
  });

  test("point input overrides param default", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("1");
    const pointInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 2,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await computeLimit({ fn: makeFunctionInput("sin(x)/x"), point: pointInput }, { point: 0 });
    expect(vi.mocked(limit)).toHaveBeenCalledWith("sin(x)/x", ["x"], "x", 2);
  });

  test("infers variable from payload when variable param is blank", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("0");
    await computeLimit({ fn: makeFunctionInput("t**2", ["t"]) }, { point: 0 });
    expect(vi.mocked(limit)).toHaveBeenCalledWith("t**2", ["t"], "t", 0);
  });

  test("provenance engine is sympy, blockId is calc.limit", async () => {
    await mockLimit(() => "1");
    const result = await computeLimit({ fn: makeFunctionInput("sin(x)/x") }, { point: 0 });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.limit");
  });

  test("throws LimitError when fn input is missing", async () => {
    await expect(computeLimit({}, {})).rejects.toThrow(LimitError);
    await expect(computeLimit({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws LimitError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeLimit({ fn: scalarInput }, {})).rejects.toThrow(LimitError);
  });

  test("throws LimitError wrapping worker error", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockRejectedValue(new Error("SymPy internal error"));
    await expect(computeLimit({ fn: makeFunctionInput("sin(x)/x") }, {})).rejects.toThrow(
      LimitError,
    );
    await expect(computeLimit({ fn: makeFunctionInput("sin(x)/x") }, {})).rejects.toThrow(
      /SymPy limit failed/,
    );
  });
});

describe("calc.limit definition explain", () => {
  function scalarOutput(val: number): MathValue {
    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: val,
      provenance: { blockId: "calc.limit", inputs: [], computedAt: 0, engine: "sympy" },
    };
  }

  function expressionOutput(serialized: string): MathValue {
    const payload: ExpressionPayload = { form: "sympy", serialized, freeVars: [] };
    return {
      type: { kind: "Expression", freeVars: [] },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.limit", inputs: [], computedAt: 0, engine: "sympy" },
    };
  }

  test("impact returns Scalar limit string", async () => {
    const { LimitBlock } = await import("./definition");
    const impact = LimitBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    expect(impact({}, scalarOutput(1))).toBe("Limit: 1");
  });

  test("impact returns symbolic limit string for Expression output", async () => {
    const { LimitBlock } = await import("./definition");
    const impact = LimitBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    expect(impact({}, expressionOutput("oo"))).toBe("Limit: oo");
  });
});
