/**
 * Cross-engine tests for calc.gradient — verifies that computeGradient calls
 * SymPy diff() for each variable in the correct order and assembles the
 * vector payload from the returned partial derivative strings.
 *
 * Pyodide is unavailable in jsdom; the diff client is mocked to return the
 * fixture's pre-computed partial derivative strings. This verifies:
 *   1. computeGradient calls diff once per variable with correct args.
 *   2. Numeric partials are stored as vector components.
 *   3. Symbolic (non-numeric) partials become NaN in the vector.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { loadCalcGradientFixture } from "../../../../tests/sympy-reference";
import { computeGradient } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcGradientFixture();

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

describe("calc.gradient cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("diff called once per variable with correct args", () => {
    for (const c of fixture.cases) {
      test(`∇(${c.expression}) wrt [${c.variables.join(", ")}] — diff args forwarded`, async () => {
        const { diff } = await import("~/engine/workers/pyodide.client");
        let callIdx = 0;
        vi.mocked(diff).mockImplementation(() => Promise.resolve(c.partials[callIdx++] ?? "0"));

        await computeGradient({ fn: makeFnInput(c.expression, c.variables) }, {});

        expect(vi.mocked(diff)).toHaveBeenCalledTimes(c.variables.length);
        for (const [i, v] of c.variables.entries()) {
          expect(vi.mocked(diff)).toHaveBeenNthCalledWith(i + 1, c.expression, c.variables, v);
        }
      });
    }
  });

  describe("gradient vector components match expected values", () => {
    for (const c of fixture.cases) {
      const expected = c.gradient;
      if (expected !== null) {
        test(`∇(${c.expression}) = [${expected.join(", ")}]`, async () => {
          const { diff } = await import("~/engine/workers/pyodide.client");
          let callIdx = 0;
          vi.mocked(diff).mockImplementation(() => Promise.resolve(c.partials[callIdx++] ?? "0"));

          const result = await computeGradient({ fn: makeFnInput(c.expression, c.variables) }, {});
          const components = result.payload as unknown as VectorPayload;

          expect(result.type).toEqual({ kind: "Vector", n: c.variables.length, field: "real" });
          for (const [i, val] of expected.entries()) {
            expect(components[i]).toBe(val);
          }
        });
      }
    }
  });

  describe("symbolic partials become NaN in vector", () => {
    for (const c of fixture.cases) {
      if (c.gradient === null) {
        test(`∇(${c.expression}) has symbolic partials → NaN components`, async () => {
          const { diff } = await import("~/engine/workers/pyodide.client");
          let callIdx = 0;
          vi.mocked(diff).mockImplementation(() => Promise.resolve(c.partials[callIdx++] ?? "0"));

          const result = await computeGradient({ fn: makeFnInput(c.expression, c.variables) }, {});
          const components = result.payload as unknown as VectorPayload;

          for (const component of components) {
            expect(Number.isNaN(component)).toBe(true);
          }
        });
      }
    }
  });

  test("result type is Vector<n, real> where n = number of variables", async () => {
    for (const c of fixture.cases) {
      const { diff } = await import("~/engine/workers/pyodide.client");
      let callIdx = 0;
      vi.mocked(diff).mockImplementation(() => Promise.resolve(c.partials[callIdx++] ?? "0"));
      const result = await computeGradient({ fn: makeFnInput(c.expression, c.variables) }, {});
      expect(result.type.kind).toBe("Vector");
      if (result.type.kind === "Vector") {
        expect(result.type.n).toBe(c.variables.length);
      }
      vi.clearAllMocks();
    }
  });

  test("provenance engine is sympy, blockId is calc.gradient", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("2");
    const result = await computeGradient({ fn: makeFnInput("2*x + 3*y", ["x", "y"]) }, {});
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.gradient");
  });

  test("linear function: ∇(2x+3y) = [2, 3] with explicit mocks", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValueOnce("2").mockResolvedValueOnce("3");
    const result = await computeGradient({ fn: makeFnInput("2*x + 3*y", ["x", "y"]) }, {});
    const components = result.payload as unknown as VectorPayload;
    expect(components).toEqual([2, 3]);
  });

  test("three-variable function: ∇(x+2y+3z) = [1, 2, 3] with explicit mocks", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff)
      .mockResolvedValueOnce("1")
      .mockResolvedValueOnce("2")
      .mockResolvedValueOnce("3");
    const result = await computeGradient({ fn: makeFnInput("x + 2*y + 3*z", ["x", "y", "z"]) }, {});
    const components = result.payload as unknown as VectorPayload;
    expect(components).toEqual([1, 2, 3]);
  });
});
