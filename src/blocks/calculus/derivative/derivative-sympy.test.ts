/**
 * Cross-engine tests for calc.derivative — verifies that computeDerivative
 * passes expression/variable/diffVar to SymPy diff() and stores the correct
 * canonical string from tests/fixtures/sympy/calc-derivative.json.
 *
 * Pyodide is unavailable in jsdom; the diff client is mocked.
 * Each fixture case: build a FunctionPayload, call computeDerivative,
 * assert FunctionPayload.expression matches fixture derivative string.
 *
 * Additional: higher-order chain test — d/dx(d/dx(x**4)) = 12*x**2.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcDerivativeFixture } from "../../../../tests/sympy-reference";
import { computeDerivative } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcDerivativeFixture();

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

describe("calc.derivative cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("FunctionPayload.expression matches SymPy diff() for each case", () => {
    for (const c of fixture.cases) {
      test(`diff(${c.expression}, ${c.diffVar}) → "${c.derivative}"`, async () => {
        const { diff } = await import("~/engine/workers/pyodide.client");
        vi.mocked(diff).mockResolvedValue(c.derivative);

        const result = await computeDerivative(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.diffVar },
        );
        const payload = result.payload as unknown as FunctionPayload;

        expect(payload.expression).toBe(c.derivative);
        expect(payload.variables).toEqual([c.variable]);
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} — correct expression/variables/diffVar forwarded`, async () => {
        const { diff } = await import("~/engine/workers/pyodide.client");
        vi.mocked(diff).mockResolvedValue(c.derivative);

        await computeDerivative(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.diffVar },
        );

        expect(vi.mocked(diff)).toHaveBeenCalledWith(c.expression, [c.variable], c.diffVar);
      });
    }
  });

  test("result preserves Function type from input for all cases", async () => {
    for (const c of fixture.cases) {
      const { diff } = await import("~/engine/workers/pyodide.client");
      vi.mocked(diff).mockResolvedValue(c.derivative);
      const result = await computeDerivative(
        { fn: makeFnInput(c.expression, [c.variable]) },
        { variable: c.diffVar },
      );
      expect(result.type.kind).toBe("Function");
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy, blockId is calc.derivative", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2*x");
    const result = await computeDerivative({ fn: makeFnInput("x**2") }, { variable: "x" });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.derivative");
  });

  test("higher-order chain: d/dx(d/dx(x**4)) = 12*x**2", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    // First derivative: x**4 → 4*x**3
    vi.mocked(diff).mockResolvedValueOnce("4*x**3");
    const firstDeriv = await computeDerivative({ fn: makeFnInput("x**4") }, { variable: "x" });
    // Second derivative: 4*x**3 → 12*x**2
    vi.mocked(diff).mockResolvedValueOnce("12*x**2");
    const secondDeriv = await computeDerivative({ fn: firstDeriv }, { variable: "x" });
    const payload = secondDeriv.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("12*x**2");
  });
});
