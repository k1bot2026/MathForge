/**
 * Cross-engine tests for calc.series — verifies that computeSeries passes the
 * correct Sum().doit() expression to SymPy sympify() and returns the right
 * result from tests/fixtures/sympy/calc-series.json.
 *
 * Pyodide is unavailable in jsdom; the sympify client is mocked to return the
 * fixture's pre-computed SymPy Sum().doit() str(). This verifies:
 *   1. computeSeries correctly builds Sum(aₙ, (n, from, to)).doit().
 *   2. Numeric results return as Scalar; rational/symbolic as Function.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { loadCalcSeriesFixture } from "../../../../tests/sympy-reference";
import { computeSeries } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  sympify: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcSeriesFixture();

function makeFnInput(expression: string, variables: string[] = ["n"]): MathValue {
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

describe("calc.series cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("result matches SymPy Sum().doit() for each case", () => {
    for (const c of fixture.cases) {
      test(`Σ_{${c.index}=${c.from}}^{${c.to}} ${c.expression} → "${c.result}"`, async () => {
        const { sympify } = await import("~/engine/workers/pyodide.client");
        vi.mocked(sympify).mockResolvedValue(c.result);

        const result = await computeSeries(
          { fn: makeFnInput(c.expression, [c.index]) },
          { index: c.index, from: c.from, to: c.to },
        );

        if (c.numericResult !== null) {
          expect(result.type.kind).toBe("Scalar");
          expect(result.payload).toBe(c.numericResult);
        } else {
          // Rational/symbolic result → Function payload
          expect(result.type.kind).toBe("Function");
          const payload = result.payload as unknown as FunctionPayload;
          expect(payload.expression).toBe(c.result);
        }
      });
    }
  });

  describe("sympify called with Sum(aₙ, (index, from, to)).doit() expression", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} [${c.from}, ${c.to}] — Sum expression forwarded to sympify`, async () => {
        const { sympify } = await import("~/engine/workers/pyodide.client");
        vi.mocked(sympify).mockResolvedValue(c.result);

        await computeSeries(
          { fn: makeFnInput(c.expression, [c.index]) },
          { index: c.index, from: c.from, to: c.to },
        );

        const expectedSumExpr = `Sum(${c.expression}, (${c.index}, ${c.from}, ${c.to})).doit()`;
        expect(vi.mocked(sympify)).toHaveBeenCalledWith(
          expectedSumExpr,
          expect.arrayContaining([c.index]),
        );
      });
    }
  });

  test("provenance engine is sympy, blockId is calc.series", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("55");
    const result = await computeSeries({ fn: makeFnInput("n") }, { index: "n", from: 1, to: 10 });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.series");
  });

  test("arithmetic sum Σ_{n=1}^{10} n = 55 (Gauss formula)", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("55");
    const result = await computeSeries({ fn: makeFnInput("n") }, { index: "n", from: 1, to: 10 });
    expect(result.type.kind).toBe("Scalar");
    expect(result.payload).toBe(55);
  });

  test("geometric sum Σ_{n=0}^{4} 2^n = 31", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("31");
    const result = await computeSeries({ fn: makeFnInput("2**n") }, { index: "n", from: 0, to: 4 });
    expect(result.type.kind).toBe("Scalar");
    expect(result.payload).toBe(31);
  });

  test("harmonic partial sum Σ 1/n returns rational string (non-numeric)", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("137/60");
    const result = await computeSeries({ fn: makeFnInput("1/n") }, { index: "n", from: 1, to: 5 });
    expect(result.type.kind).toBe("Function");
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("137/60");
  });

  test("alternating sum Σ (-1)^n from 0 to 5 = 0", async () => {
    const { sympify } = await import("~/engine/workers/pyodide.client");
    vi.mocked(sympify).mockResolvedValue("0");
    const result = await computeSeries(
      { fn: makeFnInput("(-1)**n") },
      { index: "n", from: 0, to: 5 },
    );
    expect(result.type.kind).toBe("Scalar");
    expect(result.payload).toBe(0);
  });
});
