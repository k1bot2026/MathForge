/**
 * Cross-engine tests for calc.partial — verifies that computePartial passes
 * the correct expression/variables/diffVar to SymPy diff() and stores the
 * returned partial derivative string from tests/fixtures/sympy/calc-partial.json.
 *
 * Pyodide is unavailable in jsdom; the diff client is mocked.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcPartialFixture } from "../../../../tests/sympy-reference";
import { computePartial } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcPartialFixture();

function makeFnInput(expression: string, variables: string[]): MathValue {
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

describe("calc.partial cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("FunctionPayload.expression matches SymPy diff() for each case", () => {
    for (const c of fixture.cases) {
      test(`∂(${c.expression})/∂${c.diffVar} → "${c.partial}"`, async () => {
        const { diff } = await import("~/engine/workers/pyodide.client");
        vi.mocked(diff).mockResolvedValue(c.partial);

        const result = await computePartial(
          { fn: makeFnInput(c.expression, c.variables) },
          { variable: c.diffVar },
        );
        const payload = result.payload as unknown as FunctionPayload;

        expect(payload.expression).toBe(c.partial);
        expect(payload.variables).toEqual(c.variables);
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} ∂/∂${c.diffVar} — correct args forwarded`, async () => {
        const { diff } = await import("~/engine/workers/pyodide.client");
        vi.mocked(diff).mockResolvedValue(c.partial);

        await computePartial(
          { fn: makeFnInput(c.expression, c.variables) },
          { variable: c.diffVar },
        );

        expect(vi.mocked(diff)).toHaveBeenCalledWith(c.expression, c.variables, c.diffVar);
      });
    }
  });

  test("result type preserves Function type for all cases", async () => {
    for (const c of fixture.cases) {
      const { diff } = await import("~/engine/workers/pyodide.client");
      vi.mocked(diff).mockResolvedValue(c.partial);
      const result = await computePartial(
        { fn: makeFnInput(c.expression, c.variables) },
        { variable: c.diffVar },
      );
      expect(result.type.kind).toBe("Function");
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy, blockId is calc.partial", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2*x");
    const result = await computePartial(
      { fn: makeFnInput("x**2 + y**2", ["x", "y"]) },
      { variable: "x" },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.partial");
  });

  test("∂(sin(x)*cos(y))/∂x = cos(x)*cos(y)", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("cos(x)*cos(y)");
    const result = await computePartial(
      { fn: makeFnInput("sin(x)*cos(y)", ["x", "y"]) },
      { variable: "x" },
    );
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("cos(x)*cos(y)");
  });

  test("∂(x*y)/∂x = y, ∂(x*y)/∂y = x (symmetry)", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");

    vi.mocked(diff).mockResolvedValue("y");
    const dx = await computePartial({ fn: makeFnInput("x*y", ["x", "y"]) }, { variable: "x" });
    const dxPayload = dx.payload as unknown as FunctionPayload;
    expect(dxPayload.expression).toBe("y");

    vi.clearAllMocks();
    vi.mocked(diff).mockResolvedValue("x");
    const dy = await computePartial({ fn: makeFnInput("x*y", ["x", "y"]) }, { variable: "y" });
    const dyPayload = dy.payload as unknown as FunctionPayload;
    expect(dyPayload.expression).toBe("x");
  });
});
