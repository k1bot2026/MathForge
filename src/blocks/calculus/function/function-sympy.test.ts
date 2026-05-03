/**
 * Cross-engine tests for calc.function — verifies that computeFunction passes
 * the expression through SymPy sympify() and stores the canonical str() form
 * from tests/fixtures/sympy/calc-function.json.
 *
 * Pyodide is unavailable in jsdom; the client module is mocked so that each
 * test case returns the fixture's pre-computed SymPy str() canonical form.
 * This verifies:
 *   1. computeFunction correctly forwards (expression, [variable]) to sympify.
 *   2. The FunctionPayload.expression stores SymPy's canonical string.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload } from "~/math/types";
import { loadCalcFunctionFixture } from "../../../../tests/sympy-reference";
import { computeFunction } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  sympify: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcFunctionFixture();

describe("calc.function cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("FunctionPayload.expression stores SymPy canonical form for each case", () => {
    for (const c of fixture.cases) {
      test(`sympify(${JSON.stringify(c.inputExpr)}, ${c.variable}) → "${c.canonical}"`, async () => {
        const { sympify } = await import("~/engine/workers/pyodide.client");
        vi.mocked(sympify).mockResolvedValue(c.canonical);

        const result = await computeFunction({}, { expression: c.inputExpr, variable: c.variable });
        const payload = result.payload as unknown as FunctionPayload;

        expect(payload.expression).toBe(c.canonical);
        expect(payload.variables).toEqual([c.variable]);
      });
    }
  });

  describe("worker called with correct expression and variable for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.variable}: ${c.inputExpr} — correct args forwarded to sympify`, async () => {
        const { sympify } = await import("~/engine/workers/pyodide.client");
        vi.mocked(sympify).mockResolvedValue(c.canonical);

        await computeFunction({}, { expression: c.inputExpr, variable: c.variable });

        expect(vi.mocked(sympify)).toHaveBeenCalledWith(c.inputExpr, [c.variable]);
      });
    }
  });

  test("result type is Function(arity=1) for all cases", async () => {
    for (const c of fixture.cases) {
      const { sympify } = await import("~/engine/workers/pyodide.client");
      vi.mocked(sympify).mockResolvedValue(c.canonical);
      const result = await computeFunction({}, { expression: c.inputExpr, variable: c.variable });
      expect(result.type.kind).toBe("Function");
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy for all cases", async () => {
    for (const c of fixture.cases) {
      const { sympify } = await import("~/engine/workers/pyodide.client");
      vi.mocked(sympify).mockResolvedValue(c.canonical);
      const result = await computeFunction({}, { expression: c.inputExpr, variable: c.variable });
      expect(result.provenance.engine).toBe("sympy");
      vi.clearAllMocks();
    }
  });
});
