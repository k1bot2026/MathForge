import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computePartial, PartialError } from "./compute";

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

describe("calc.partial compute", () => {
  test("returns Function type", async () => {
    await mockDiff(() => "2*x");
    const result = await computePartial(
      { fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) },
      { variable: "x" },
    );
    expect(result.type.kind).toBe("Function");
  });

  test("passes expression, all variables, and diff var to worker", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2*y");
    await computePartial({ fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) }, { variable: "y" });
    expect(vi.mocked(diff)).toHaveBeenCalledWith("x**2 + y**2", ["x", "y"], "y");
  });

  test("partial w.r.t. x holds y constant", async () => {
    await mockDiff(() => "2*x");
    const result = await computePartial(
      { fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) },
      { variable: "x" },
    );
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("2*x");
    expect(payload.variables).toEqual(["x", "y"]);
  });

  test("provenance engine is sympy, blockId is calc.partial", async () => {
    await mockDiff(() => "2*x");
    const result = await computePartial(
      { fn: makeFunctionInput("x**2 + y**2", ["x", "y"]) },
      { variable: "x" },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.partial");
  });

  test("throws PartialError when fn input is missing", async () => {
    await expect(computePartial({}, {})).rejects.toThrow(PartialError);
    await expect(computePartial({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws PartialError when input is not Function kind", async () => {
    const scalar: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 1,
      provenance: { blockId: "x", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computePartial({ fn: scalar }, {})).rejects.toThrow(PartialError);
  });

  test("throws PartialError wrapping worker error", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockRejectedValue(new Error("SymPy error"));
    await expect(
      computePartial({ fn: makeFunctionInput("x**2", ["x"]) }, { variable: "x" }),
    ).rejects.toThrow(PartialError);
    await expect(
      computePartial({ fn: makeFunctionInput("x**2", ["x"]) }, { variable: "x" }),
    ).rejects.toThrow(/SymPy partial diff failed/);
  });
});

describe("calc.partial definition explain", () => {
  test("impact returns partial expression string", async () => {
    const { PartialBlock } = await import("./definition");
    const impact = PartialBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const payload: FunctionPayload = { expression: "2*x", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.partial", inputs: ["fn"], computedAt: 0, engine: "sympy" },
    };
    expect(impact({}, output)).toBe("Partial: 2*x");
  });
});
