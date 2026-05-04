import { afterEach, describe, expect, test, vi } from "vitest";
import type { ExpressionPayload, FunctionPayload, MathValue } from "~/math/types";
import { computeOdeSolve, OdeSolveError } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  dsolve: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function makeScalarInput(value: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: value,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

async function mockDsolve(rhs: string, implicit = false) {
  const { dsolve } = await import("~/engine/workers/pyodide.client");
  vi.mocked(dsolve).mockResolvedValue({ rhs, implicit });
}

describe("calc.ode-solve compute", () => {
  test("returns Function type for explicit solution", async () => {
    await mockDsolve("C1*exp(x)");
    const result = await computeOdeSolve({}, { ode: "y' - y" });
    expect(result.type.kind).toBe("Function");
    expect((result.type as { kind: "Function"; arity: number }).arity).toBe(1);
  });

  test("Function payload has expression and variable from indepVar", async () => {
    await mockDsolve("C1*exp(x)");
    const result = await computeOdeSolve({}, { ode: "y' - y", indepVar: "x" });
    const p = result.payload as unknown as FunctionPayload;
    expect(p.expression).toBe("C1*exp(x)");
    expect(p.variables).toEqual(["x"]);
  });

  test("returns Expression type for implicit solution", async () => {
    await mockDsolve("Eq(y(x)**2 + x**2, C1)", true);
    const result = await computeOdeSolve({}, { ode: "y' + x/y" });
    expect(result.type.kind).toBe("Expression");
    const p = result.payload as unknown as ExpressionPayload;
    expect(p.form).toBe("sympy");
    expect(p.serialized).toBe("Eq(y(x)**2 + x**2, C1)");
  });

  test("provenance blockId is calc.ode-solve, engine is sympy", async () => {
    await mockDsolve("C1*exp(x)");
    const result = await computeOdeSolve({}, { ode: "y' - y" });
    expect(result.provenance.blockId).toBe("calc.ode-solve");
    expect(result.provenance.engine).toBe("sympy");
  });

  test("passes normalised ODE Eq() to dsolve worker", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "y' - y", depVar: "y", indepVar: "x" });
    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(
      expect.stringContaining("Eq("),
      "y",
      "x",
      undefined,
    );
  });

  test("passes ics when x0/y0 param scalars are provided", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "y' - y", x0: 0, y0: 1 });
    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(expect.stringContaining("Eq("), "y", "x", {
      x0: 0,
      y0: 1,
    });
  });

  test("input port x0/y0 scalars override param values for ics", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "exp(x)", implicit: false });
    await computeOdeSolve(
      { x0: makeScalarInput(2), y0: makeScalarInput(3) },
      { ode: "y' - y", x0: 0, y0: 1 },
    );
    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(expect.stringContaining("Eq("), "y", "x", {
      x0: 2,
      y0: 3,
    });
  });

  test("no ics when only x0 is provided (partial IVP is skipped)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "y' - y", x0: 0 });
    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(
      expect.stringContaining("Eq("),
      "y",
      "x",
      undefined,
    );
  });

  test("provenance inputs includes x0/y0 when ics applied", async () => {
    await mockDsolve("exp(x)");
    const result = await computeOdeSolve({}, { ode: "y' - y", x0: 0, y0: 1 });
    expect(result.provenance.inputs).toEqual(["x0", "y0"]);
  });

  test("provenance inputs is empty when no ics", async () => {
    await mockDsolve("C1*exp(x)");
    const result = await computeOdeSolve({}, { ode: "y' - y" });
    expect(result.provenance.inputs).toEqual([]);
  });

  test("throws OdeSolveError when ode param is missing", async () => {
    await expect(computeOdeSolve({}, {})).rejects.toThrow(OdeSolveError);
    await expect(computeOdeSolve({}, {})).rejects.toThrow("requires an ODE expression");
  });

  test("throws OdeSolveError when ode param is blank string", async () => {
    await expect(computeOdeSolve({}, { ode: "   " })).rejects.toThrow(OdeSolveError);
  });

  test("throws OdeSolveError wrapping worker error", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockRejectedValue(new Error("No algorithms are implemented"));
    await expect(computeOdeSolve({}, { ode: "y' - y" })).rejects.toThrow(OdeSolveError);
    await expect(computeOdeSolve({}, { ode: "y' - y" })).rejects.toThrow(/SymPy ODE solve failed/);
  });
});

describe("normaliseOde (via compute integration)", () => {
  test("passes Eq() expressions through unchanged", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "Eq(Derivative(y(x), x) - y(x), 0)" });
    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(
      "Eq(Derivative(y(x), x) - y(x), 0)",
      "y",
      "x",
      undefined,
    );
  });

  test("wraps plain expression in Eq(…, 0)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "y' - y", depVar: "y", indepVar: "x" });
    const calledWith = vi.mocked(dsolve).mock.calls[0]?.[0];
    expect(calledWith).toMatch(/^Eq\(/);
    expect(calledWith).toContain("Derivative(y(x), x)");
  });

  test("handles explicit lhs=rhs notation", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    await computeOdeSolve({}, { ode: "y' = y", depVar: "y", indepVar: "x" });
    const calledWith = vi.mocked(dsolve).mock.calls[0]?.[0];
    expect(calledWith).toMatch(/^Eq\(/);
  });
});

describe("calc.ode-solve definition explain", () => {
  test("effect returns explicit solution string for Function output", async () => {
    const { OdeSolveBlock } = await import("./definition");
    const { effect } = OdeSolveBlock.explain;
    if (effect === undefined) throw new Error("effect is undefined");
    const p: FunctionPayload = { expression: "C1*exp(x)", variables: ["x"] };
    const output: MathValue = {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: p as unknown as number,
      provenance: { blockId: "calc.ode-solve", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toBe("y(x) = C1*exp(x)");
  });

  test("effect returns implicit prefix for Expression output", async () => {
    const { OdeSolveBlock } = await import("./definition");
    const { effect } = OdeSolveBlock.explain;
    if (effect === undefined) throw new Error("effect is undefined");
    const p: ExpressionPayload = {
      form: "sympy",
      serialized: "Eq(y(x)**2 + x**2, C1)",
      freeVars: ["x"],
    };
    const output: MathValue = {
      type: { kind: "Expression", freeVars: ["x"] },
      payload: p as unknown as number,
      provenance: { blockId: "calc.ode-solve", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toMatch(/^\[implicit\]/);
  });

  test("effect returns fallback string for unexpected output type", async () => {
    const { OdeSolveBlock } = await import("./definition");
    const { effect } = OdeSolveBlock.explain;
    if (effect === undefined) throw new Error("effect is undefined");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "calc.ode-solve", inputs: [], computedAt: 0, engine: "sympy" },
    };
    expect(effect({}, output)).toBe("ODE solution");
  });
});
