import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeTaylor, TaylorError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  taylor: vi.fn(),
}));

async function mockTaylor(
  impl: (expr: string, vars: string[], seriesVar: string, center: number, order: number) => string,
) {
  const { taylor } = await import("~/engine/workers/pyodide.client");
  vi.mocked(taylor).mockImplementation((e, v, s, c, o) => Promise.resolve(impl(e, v, s, c, o)));
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

describe("calc.taylor compute", () => {
  test("returns Function type preserving arity and domain/codomain", async () => {
    await mockTaylor(() => "1 - x**2/2 + x**4/24");
    const result = await computeTaylor(
      { fn: makeFunctionInput("cos(x)") },
      { center: 0, order: 4 },
    );
    expect(result.type).toEqual({
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    });
  });

  test("payload stores Taylor polynomial expression", async () => {
    await mockTaylor(() => "1 - x**2/2");
    const result = await computeTaylor(
      { fn: makeFunctionInput("cos(x)") },
      { center: 0, order: 2 },
    );
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("1 - x**2/2");
    expect(payload.variables).toEqual(["x"]);
  });

  test("passes expression, variables, seriesVar, center, order to worker", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("x");
    await computeTaylor({ fn: makeFunctionInput("sin(x)") }, { center: 0, order: 1 });
    expect(vi.mocked(taylor)).toHaveBeenCalledWith("sin(x)", ["x"], "x", 0, 1);
  });

  test("center and order inputs override param defaults", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("(x - 1)**2");
    await computeTaylor(
      {
        fn: makeFunctionInput("(x-1)**2"),
        center: makeScalarInput(1),
        order: makeScalarInput(3),
      },
      { center: 0, order: 5 },
    );
    expect(vi.mocked(taylor)).toHaveBeenCalledWith("(x-1)**2", ["x"], "x", 1, 3);
  });

  test("order is clamped to minimum 1", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("0");
    await computeTaylor({ fn: makeFunctionInput("sin(x)") }, { center: 0, order: -2 });
    expect(vi.mocked(taylor)).toHaveBeenCalledWith("sin(x)", ["x"], "x", 0, 1);
  });

  test("infers variable from payload when param is blank", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("t");
    await computeTaylor({ fn: makeFunctionInput("sin(t)", ["t"]) }, { center: 0, order: 1 });
    expect(vi.mocked(taylor)).toHaveBeenCalledWith("sin(t)", ["t"], "t", 0, 1);
  });

  test("provenance engine is sympy, blockId is calc.taylor", async () => {
    await mockTaylor(() => "1 - x**2/2");
    const result = await computeTaylor(
      { fn: makeFunctionInput("cos(x)") },
      { center: 0, order: 2 },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.taylor");
    expect(result.provenance.inputs).toEqual(["fn"]);
  });

  test("throws TaylorError when fn input is missing", async () => {
    await expect(computeTaylor({}, {})).rejects.toThrow(TaylorError);
    await expect(computeTaylor({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws TaylorError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeTaylor({ fn: scalarInput }, {})).rejects.toThrow(TaylorError);
  });

  test("throws TaylorError wrapping worker error", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockRejectedValue(new Error("SymPy internal error"));
    await expect(
      computeTaylor({ fn: makeFunctionInput("sin(x)") }, { center: 0, order: 5 }),
    ).rejects.toThrow(TaylorError);
    await expect(
      computeTaylor({ fn: makeFunctionInput("sin(x)") }, { center: 0, order: 5 }),
    ).rejects.toThrow(/SymPy taylor failed/);
  });
});
