import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeSeries, SeriesError } from "./compute";

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

function makeFunctionInput(expression: string, variables: string[] = ["n"]): MathValue {
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

describe("calc.series compute", () => {
  test("returns Scalar when SymPy result is numeric", async () => {
    await mockSympify(() => "55");
    const result = await computeSeries({ fn: makeFunctionInput("n") }, { from: 1, to: 10 });
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
    expect(result.payload).toBe(55);
  });

  test("builds correct summation expression for worker", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("55");
    await computeSeries({ fn: makeFunctionInput("n", ["n"]) }, { from: 1, to: 10 });
    expect(vi.mocked(sympify)).toHaveBeenCalledWith("Sum(n, (n, 1, 10)).doit()", ["n"]);
  });

  test("from/to inputs override param defaults", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("25");
    await computeSeries(
      {
        fn: makeFunctionInput("n", ["n"]),
        from: makeScalarInput(2),
        to: makeScalarInput(5),
      },
      { from: 0, to: 10 },
    );
    expect(vi.mocked(sympify)).toHaveBeenCalledWith("Sum(n, (n, 2, 5)).doit()", ["n"]);
  });

  test("infers index variable from payload when index param is blank", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("10");
    await computeSeries({ fn: makeFunctionInput("k**2", ["k"]) }, { from: 0, to: 3 });
    expect(vi.mocked(sympify)).toHaveBeenCalledWith("Sum(k**2, (k, 0, 3)).doit()", ["k"]);
  });

  test("provenance engine is sympy, blockId is calc.series", async () => {
    await mockSympify(() => "55");
    const result = await computeSeries({ fn: makeFunctionInput("n") }, { from: 1, to: 10 });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.series");
  });

  test("throws SeriesError when fn input is missing", async () => {
    await expect(computeSeries({}, {})).rejects.toThrow(SeriesError);
    await expect(computeSeries({}, {})).rejects.toThrow("requires a function input");
  });

  test("throws SeriesError when input is not a Function kind", async () => {
    const scalarInput: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "some.block", inputs: [], computedAt: 0, engine: "native" },
    };
    await expect(computeSeries({ fn: scalarInput }, {})).rejects.toThrow(SeriesError);
  });

  test("throws SeriesError wrapping worker error", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockRejectedValue(new Error("SymPy internal error"));
    await expect(
      computeSeries({ fn: makeFunctionInput("1/n") }, { from: 1, to: 10 }),
    ).rejects.toThrow(SeriesError);
    await expect(
      computeSeries({ fn: makeFunctionInput("1/n") }, { from: 1, to: 10 }),
    ).rejects.toThrow(/SymPy series summation failed/);
  });
});

describe("calc.series definition explain", () => {
  test("impact returns numeric partial sum string for Scalar output", async () => {
    const { SeriesBlock } = await import("./definition");
    const impact = SeriesBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 42,
      provenance: { blockId: "calc.series", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(impact({}, output)).toBe("Partial sum: 42");
  });

  test("impact returns symbolic sum expression for Function output", async () => {
    const { SeriesBlock } = await import("./definition");
    const impact = SeriesBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const payload: FunctionPayload = { expression: "n*(n+1)/2", variables: ["n"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: payload as unknown as number,
      provenance: { blockId: "calc.series", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(impact({}, output)).toBe("Partial sum: n*(n+1)/2");
  });
});
