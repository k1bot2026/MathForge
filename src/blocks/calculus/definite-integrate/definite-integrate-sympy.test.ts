/**
 * Cross-engine tests for calc.definite-integrate — verifies that
 * computeDefiniteIntegrate passes expression/variable/integVar/a/b to SymPy
 * definiteIntegrate() and returns a Scalar whose payload matches the
 * numeric reference from tests/fixtures/sympy/calc-definite-integrate.json.
 *
 * Pyodide is unavailable in jsdom; the definiteIntegrate client is mocked.
 * The mock returns the fixture's pre-computed SymPy float result.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcDefiniteIntegrateFixture } from "../../../../tests/sympy-reference";
import { computeDefiniteIntegrate } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  definiteIntegrate: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcDefiniteIntegrateFixture();
const TOL = 1e-9;

function makeFnInput(expression: string, variables: string[] = ["x"]): MathValue {
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

describe("calc.definite-integrate cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("scalar payload matches SymPy float result for each case", () => {
    for (const c of fixture.cases) {
      test(`∫_${c.a}^${c.b} ${c.expression} d${c.integVar} ≈ ${c.result}`, async () => {
        const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
        vi.mocked(definiteIntegrate).mockResolvedValue(c.result);

        const result = await computeDefiniteIntegrate(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.integVar, a: c.a, b: c.b },
        );

        expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
        expect(Math.abs((result.payload as unknown as number) - c.result)).toBeLessThan(TOL);
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} [${c.a}, ${c.b}] — correct args forwarded`, async () => {
        const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
        vi.mocked(definiteIntegrate).mockResolvedValue(c.result);

        await computeDefiniteIntegrate(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.integVar, a: c.a, b: c.b },
        );

        expect(vi.mocked(definiteIntegrate)).toHaveBeenCalledWith(
          c.expression,
          [c.variable],
          c.integVar,
          c.a,
          c.b,
        );
      });
    }
  });

  test("provenance engine is sympy, blockId is calc.definite-integrate", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(1 / 3);
    const result = await computeDefiniteIntegrate(
      { fn: makeFnInput("x**2") },
      { variable: "x", a: 0, b: 1 },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.definite-integrate");
  });

  test("∫_0^1 x^2 dx = 1/3 exactly (SymPy rational)", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(1 / 3);
    const result = await computeDefiniteIntegrate(
      { fn: makeFnInput("x**2") },
      { variable: "x", a: 0, b: 1 },
    );
    expect(Math.abs((result.payload as unknown as number) - 1 / 3)).toBeLessThan(TOL);
  });

  test("∫_0^π sin(x) dx = 2 (exact)", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(2);
    const result = await computeDefiniteIntegrate(
      { fn: makeFnInput("sin(x)") },
      { variable: "x", a: 0, b: Math.PI },
    );
    expect(Math.abs((result.payload as unknown as number) - 2)).toBeLessThan(TOL);
  });

  test("∫_-1^1 x^3 dx = 0 (odd function on symmetric interval)", async () => {
    const { definiteIntegrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(definiteIntegrate).mockResolvedValue(0);
    const result = await computeDefiniteIntegrate(
      { fn: makeFnInput("x**3") },
      { variable: "x", a: -1, b: 1 },
    );
    expect(Math.abs(result.payload as unknown as number)).toBeLessThan(TOL);
  });
});
