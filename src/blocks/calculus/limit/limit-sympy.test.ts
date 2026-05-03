/**
 * Cross-engine tests for calc.limit — verifies that computeLimit passes
 * expression/variable/limitVar/point to SymPy limit() and returns the correct
 * result from tests/fixtures/sympy/calc-limit.json.
 *
 * Pyodide is unavailable in jsdom; the limit client is mocked.
 *
 * Important: computeLimit branches on whether resultStr parses as a finite
 * number (returns Scalar) or not (returns Expression). The fixture's "limit"
 * field is the SymPy str() — "1" → Scalar(1), "1/2" → Expression("1/2").
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { ExpressionPayload, FunctionPayload, MathValue } from "~/math/types";
import { loadCalcLimitFixture } from "../../../../tests/sympy-reference";
import { computeLimit } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  limit: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcLimitFixture();

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

describe("calc.limit cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("result matches SymPy limit() str() for each case", () => {
    for (const c of fixture.cases) {
      const numericResult = Number(c.limit);
      const isNumeric = Number.isFinite(numericResult);

      test(`lim_{${c.limitVar}→${c.point}} ${c.expression} → "${c.limit}"`, async () => {
        const { limit } = await import("~/engine/workers/pyodide.client");
        vi.mocked(limit).mockResolvedValue(c.limit);

        const result = await computeLimit(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.limitVar, point: c.point },
        );

        if (isNumeric) {
          expect(result.type.kind).toBe("Scalar");
          expect(Math.abs((result.payload as unknown as number) - numericResult)).toBeLessThan(
            1e-9,
          );
        } else {
          expect(result.type.kind).toBe("Expression");
          const payload = result.payload as unknown as ExpressionPayload;
          expect(payload.serialized).toBe(c.limit);
          expect(payload.form).toBe("sympy");
        }
      });
    }
  });

  describe("worker called with correct args for each case", () => {
    for (const c of fixture.cases) {
      test(`${c.expression} → ${c.point} — correct args forwarded`, async () => {
        const { limit } = await import("~/engine/workers/pyodide.client");
        vi.mocked(limit).mockResolvedValue(c.limit);

        await computeLimit(
          { fn: makeFnInput(c.expression, [c.variable]) },
          { variable: c.limitVar, point: c.point },
        );

        expect(vi.mocked(limit)).toHaveBeenCalledWith(
          c.expression,
          [c.variable],
          c.limitVar,
          c.point,
        );
      });
    }
  });

  test("lim_{x→0} sin(x)/x = 1 as Scalar", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("1");
    const result = await computeLimit(
      { fn: makeFnInput("sin(x)/x") },
      { variable: "x", point: "0" },
    );
    expect(result.type.kind).toBe("Scalar");
    expect(result.payload).toBe(1);
  });

  test("lim_{x→0} (1-cos(x))/x^2 = 1/2 as Expression (non-numeric str)", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("1/2");
    const result = await computeLimit(
      { fn: makeFnInput("(1 - cos(x)) / x**2") },
      { variable: "x", point: "0" },
    );
    expect(result.type.kind).toBe("Expression");
    const payload = result.payload as unknown as ExpressionPayload;
    expect(payload.serialized).toBe("1/2");
  });

  test("provenance engine is sympy, blockId is calc.limit", async () => {
    const { limit } = await import("~/engine/workers/pyodide.client");
    vi.mocked(limit).mockResolvedValue("1");
    const result = await computeLimit(
      { fn: makeFnInput("sin(x)/x") },
      { variable: "x", point: "0" },
    );
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.limit");
  });
});
