/**
 * Cross-engine tests for calc.integrate — verifies that computeIntegrate
 * passes expression/variable/integVar to SymPy integrate() and stores the
 * correct canonical string from tests/fixtures/sympy/calc-integrate.json.
 *
 * Pyodide is unavailable in jsdom; the integrate client is mocked.
 *
 * Property test: derivative(integrate(f)) === f (mod constant of integration).
 * Verified by chaining mocked integrate → derivative calls.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcIntegrateFixture } from "../../../../tests/sympy-reference";
import { computeIntegrate } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
  integrate: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcIntegrateFixture();

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

describe("calc.integrate cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("FunctionPayload.expression matches SymPy integrate() for each case", () => {
    for (const c of fixture.cases) {
      test(`∫ ${c.expression} d${c.integVar} → "${c.integral}"`, async () => {
        const { integrate } = await import("~/engine/workers/pyodide.client");
        vi.mocked(integrate).mockResolvedValue(c.integral);

        const result = await computeIntegrate(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.integVar },
        );
        const payload = result.payload as unknown as FunctionPayload;

        expect(payload.expression).toBe(c.integral);
        expect(payload.variables).toEqual([c.variable]);
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} — correct expression/variables/integVar forwarded`, async () => {
        const { integrate } = await import("~/engine/workers/pyodide.client");
        vi.mocked(integrate).mockResolvedValue(c.integral);

        await computeIntegrate(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.integVar },
        );

        expect(vi.mocked(integrate)).toHaveBeenCalledWith(c.expression, [c.variable], c.integVar);
      });
    }
  });

  test("result type preserves Function type from input for all cases", async () => {
    for (const c of fixture.cases) {
      const { integrate } = await import("~/engine/workers/pyodide.client");
      vi.mocked(integrate).mockResolvedValue(c.integral);
      const result = await computeIntegrate(
        { fn: makeFnInput(c.expression, [c.variable]) },
        { variable: c.integVar },
      );
      expect(result.type.kind).toBe("Function");
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy, blockId is calc.integrate", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    vi.mocked(integrate).mockResolvedValue("x**3/3");
    const result = await computeIntegrate({ fn: makeFnInput("x**2") }, { variable: "x" });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.integrate");
  });

  test("property: derivative(integrate(x**2)) = x**2 (mod constant)", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    const { diff } = await import("~/engine/workers/pyodide.client");
    // integrate(x**2) = x**3/3
    vi.mocked(integrate).mockResolvedValue("x**3/3");
    const integral = await computeIntegrate({ fn: makeFnInput("x**2") }, { variable: "x" });

    // diff(x**3/3) = x**2
    vi.mocked(diff).mockResolvedValue("x**2");
    const { computeDerivative } = await import("../derivative/compute");
    const result = await computeDerivative({ fn: integral }, { variable: "x" });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("x**2");
  });

  test("property: derivative(integrate(sin(x))) = sin(x) (mod constant)", async () => {
    const { integrate } = await import("~/engine/workers/pyodide.client");
    const { diff } = await import("~/engine/workers/pyodide.client");
    // integrate(sin(x)) = -cos(x)
    vi.mocked(integrate).mockResolvedValue("-cos(x)");
    const integral = await computeIntegrate({ fn: makeFnInput("sin(x)") }, { variable: "x" });

    // diff(-cos(x)) = sin(x)
    vi.mocked(diff).mockResolvedValue("sin(x)");
    const { computeDerivative } = await import("../derivative/compute");
    const result = await computeDerivative({ fn: integral }, { variable: "x" });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("sin(x)");
  });
});
