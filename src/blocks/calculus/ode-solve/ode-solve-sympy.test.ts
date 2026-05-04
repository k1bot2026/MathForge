/**
 * Cross-engine tests for calc.ode-solve — verifies that computeOdeSolve
 * normalises the ODE string into a SymPy Eq() expression, passes it to
 * dsolve() with the correct dep/indep variables and optional ICs, and
 * returns the expected solution from tests/fixtures/sympy/calc-ode-solve.json.
 *
 * Pyodide is unavailable in jsdom; the dsolve client is mocked to return
 * fixture pre-computed solutions. This verifies:
 *   1. computeOdeSolve normalises prime notation to SymPy Derivative(…).
 *   2. Explicit solutions return Function; implicit return Expression.
 *   3. ICs are forwarded to dsolve() correctly.
 *
 * @cross-engine
 */

import { afterEach, describe, expect, test, vi } from "vitest";
import type { ExpressionPayload, FunctionPayload } from "~/math/types";
import { loadCalcOdeSolveFixture } from "../../../../tests/sympy-reference";
import { computeOdeSolve } from "./compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  dsolve: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const fixture = loadCalcOdeSolveFixture();

describe("calc.ode-solve cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("result type and rhs matches fixture for each case", () => {
    for (const c of fixture.cases) {
      const label = c.ics ? `${c.ode} [y(${c.ics.x0})=${c.ics.y0}]` : c.ode;
      test(`${label} → ${c.implicit ? "[implicit]" : ""}"${c.rhs}"`, async () => {
        const { dsolve } = await import("~/engine/workers/pyodide.client");
        vi.mocked(dsolve).mockResolvedValue({ rhs: c.rhs, implicit: c.implicit });

        const params: Record<string, unknown> = {
          ode: c.ode,
          depVar: c.depVar,
          indepVar: c.indepVar,
        };
        if (c.ics !== null) {
          params.x0 = c.ics.x0;
          params.y0 = c.ics.y0;
        }

        const result = await computeOdeSolve({}, params);

        if (c.implicit) {
          expect(result.type.kind).toBe("Expression");
          const payload = result.payload as unknown as ExpressionPayload;
          expect(payload.serialized).toBe(c.rhs);
          expect(payload.form).toBe("sympy");
        } else {
          expect(result.type.kind).toBe("Function");
          const payload = result.payload as unknown as FunctionPayload;
          expect(payload.expression).toBe(c.rhs);
          expect(payload.variables).toEqual([c.indepVar]);
        }
      });
    }
  });

  describe("dsolve called with Eq() expression and correct dep/indep vars", () => {
    for (const c of fixture.cases) {
      if (c.ics !== null) continue;
      test(`${c.ode} — Eq() forwarded, vars correct`, async () => {
        const { dsolve } = await import("~/engine/workers/pyodide.client");
        vi.mocked(dsolve).mockResolvedValue({ rhs: c.rhs, implicit: c.implicit });

        await computeOdeSolve({}, { ode: c.ode, depVar: c.depVar, indepVar: c.indepVar });

        const calledWith = vi.mocked(dsolve).mock.calls[0];
        expect(calledWith?.[0]).toMatch(/^Eq\(/);
        expect(calledWith?.[1]).toBe(c.depVar);
        expect(calledWith?.[2]).toBe(c.indepVar);
        expect(calledWith?.[3]).toBeUndefined();
      });
    }
  });

  test("ICs are forwarded to dsolve when x0/y0 params provided", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "exp(x)", implicit: false });

    await computeOdeSolve({}, { ode: "y' - y", depVar: "y", indepVar: "x", x0: 0, y0: 1 });

    expect(vi.mocked(dsolve)).toHaveBeenCalledWith(expect.stringContaining("Eq("), "y", "x", {
      x0: 0,
      y0: 1,
    });
  });

  test("prime notation: y' - y normalises to Eq(Derivative(y(x), x) - y(x), 0)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });

    await computeOdeSolve({}, { ode: "y' - y", depVar: "y", indepVar: "x" });

    const calledWith = vi.mocked(dsolve).mock.calls[0]?.[0];
    expect(calledWith).toBe("Eq(Derivative(y(x), x) - y(x), 0)");
  });

  test("second-order: y'' + y normalises to Eq(Derivative(y(x), x, 2) + y(x), 0)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*sin(x) + C2*cos(x)", implicit: false });

    await computeOdeSolve({}, { ode: "y'' + y", depVar: "y", indepVar: "x" });

    const calledWith = vi.mocked(dsolve).mock.calls[0]?.[0];
    expect(calledWith).toBe("Eq(Derivative(y(x), x, 2) + y(x), 0)");
  });

  test("provenance engine is sympy, blockId is calc.ode-solve", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*exp(x)", implicit: false });
    const result = await computeOdeSolve({}, { ode: "y' - y" });
    expect(result.provenance.engine).toBe("sympy");
    expect(result.provenance.blockId).toBe("calc.ode-solve");
  });

  test("provenance inputs includes x0/y0 when ICs applied", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "exp(x)", implicit: false });
    const result = await computeOdeSolve({}, { ode: "y' - y", x0: 0, y0: 1 });
    expect(result.provenance.inputs).toEqual(["x0", "y0"]);
  });

  test("IVP solution: y' - y with y(0)=1 → exp(x)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "exp(x)", implicit: false });
    const result = await computeOdeSolve({}, { ode: "y' - y", x0: 0, y0: 1 });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("exp(x)");
  });

  test("general solution: y'' + y → C1*sin(x) + C2*cos(x)", async () => {
    const { dsolve } = await import("~/engine/workers/pyodide.client");
    vi.mocked(dsolve).mockResolvedValue({ rhs: "C1*sin(x) + C2*cos(x)", implicit: false });
    const result = await computeOdeSolve({}, { ode: "y'' + y" });
    const payload = result.payload as unknown as FunctionPayload;
    expect(payload.expression).toBe("C1*sin(x) + C2*cos(x)");
  });
});
