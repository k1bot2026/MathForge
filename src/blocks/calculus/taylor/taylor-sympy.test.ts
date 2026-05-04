/**
 * Cross-engine tests for calc.taylor — verifies that computeTaylor passes
 * expression/variable/seriesVar/center/order to SymPy series().removeO() and
 * stores the correct polynomial string from tests/fixtures/sympy/calc-taylor.json.
 *
 * Pyodide is unavailable in jsdom; the taylor client is mocked.
 *
 * Convergence property test: for analytic f(x) = exp(x), mock a high-order
 * (order=30) Taylor series polynomial, evaluate it at x=0.5 via the
 * native-polynomial path, and verify it matches exp(0.5) within 1e-9.
 * This is the Phase 4 demo correctness check.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcTaylorFixture } from "../../../../tests/sympy-reference";
import { computeTaylor } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  taylor: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcTaylorFixture();

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

/** Evaluate a SymPy-style polynomial string at a numeric point via Function constructor. */
function evalPoly(sympyExpr: string, varName: string, value: number): number {
  // Convert SymPy notation to JS: x**n → Math.pow(x,n), exp(t) → Math.exp(t)
  const jsExpr = sympyExpr
    .replace(/(\w+)\*\*(\d+)/g, "Math.pow($1,$2)")
    .replace(/exp\(([^)]+)\)/g, "Math.exp($1)");
  // eslint-disable-next-line no-new-func
  return new Function(varName, `return ${jsExpr};`)(value) as number;
}

describe("calc.taylor cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("FunctionPayload.expression matches SymPy series().removeO() for each case", () => {
    for (const c of fixture.cases) {
      test(`taylor(${c.expression}, ${c.seriesVar}=${c.center}, order=${c.order}) → "${c.taylor}"`, async () => {
        const { taylor } = await import("~/engine/workers/pyodide.client");
        vi.mocked(taylor).mockResolvedValue(c.taylor);

        const result = await computeTaylor(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.seriesVar, center: c.center, order: c.order },
        );
        const payload = result.payload as unknown as FunctionPayload;

        expect(payload.expression).toBe(c.taylor);
        expect(payload.variables).toEqual([c.variable]);
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} center=${c.center} order=${c.order} — correct args forwarded`, async () => {
        const { taylor } = await import("~/engine/workers/pyodide.client");
        vi.mocked(taylor).mockResolvedValue(c.taylor);

        await computeTaylor(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.seriesVar, center: c.center, order: c.order },
        );

        expect(vi.mocked(taylor)).toHaveBeenCalledWith(
          c.expression,
          [c.variable],
          c.seriesVar,
          c.center,
          c.order,
        );
      });
    }
  });

  test("result preserves Function type from input for all cases", async () => {
    for (const c of fixture.cases) {
      const { taylor } = await import("~/engine/workers/pyodide.client");
      vi.mocked(taylor).mockResolvedValue(c.taylor);
      const result = await computeTaylor(
        { fn: makeFnInput(c.expression, [c.variable]) },
        { variable: c.seriesVar, center: c.center, order: c.order },
      );
      expect(result.type.kind).toBe("Function");
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy, blockId is calc.taylor", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("x + 1");
    const result = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 1 },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.taylor");
  });

  test("sin(x) order=4 truncation: -x**3/6 + x", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("-x**3/6 + x");
    const result = await computeTaylor(
      { fn: makeFnInput("sin(x)") },
      { variable: "x", center: 0, order: 4 },
    );
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("-x**3/6 + x");
  });

  test("cos(x) order=4 truncation: x**4/24 - x**2/2 + 1", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue("x**4/24 - x**2/2 + 1");
    const result = await computeTaylor(
      { fn: makeFnInput("cos(x)") },
      { variable: "x", center: 0, order: 4 },
    );
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("x**4/24 - x**2/2 + 1");
  });

  test("convergence: taylor(exp(x), 0, 30) at x=0.5 is within 1e-9 of exp(0.5)", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    // Build the order-30 Taylor polynomial for exp(x) = sum_{k=0}^{30} x^k/k!
    const terms: string[] = [];
    let factorial = 1;
    for (let k = 0; k <= 30; k++) {
      if (k > 0) factorial *= k;
      if (k === 0) {
        terms.push("1");
      } else if (k === 1) {
        terms.push("x");
      } else {
        terms.push(`x**${k}/${factorial}`);
      }
    }
    const poly30 = terms.join(" + ");
    vi.mocked(taylor).mockResolvedValue(poly30);

    const result = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 30 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", 0.5);
    const exact = Math.exp(0.5);
    expect(Math.abs(approx - exact)).toBeLessThan(1e-9);
  });

  test("convergence: taylor(sin(x), 0, 29) at x=0.3 is within 1e-9 of sin(0.3)", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    // Build the order-29 Taylor polynomial for sin(x) = sum_{k=0}^{14} (-1)^k x^(2k+1)/(2k+1)!
    const terms: string[] = [];
    let factorial = 1;
    for (let k = 0; k <= 29; k++) {
      if (k > 0) factorial *= k;
      // sin has only odd terms
      if (k % 2 === 1) {
        const sign = ((k - 1) / 2) % 2 === 0 ? "+" : "-";
        terms.push(`${sign} x**${k}/${factorial}`);
      }
    }
    const poly29 = terms.join(" ").replace(/^\+ /, "");
    vi.mocked(taylor).mockResolvedValue(poly29);

    const result = await computeTaylor(
      { fn: makeFnInput("sin(x)") },
      { variable: "x", center: 0, order: 29 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", 0.3);
    const exact = Math.sin(0.3);
    expect(Math.abs(approx - exact)).toBeLessThan(1e-9);
  });
});
