/**
 * Compositional invariant tests for Phase 4 calculus blocks.
 *
 * Invariant 1 — Taylor convergence:
 *   taylor(f, center=0, order=n).evaluate(x) → f(x) pointwise as n → large
 *   Verified numerically by mocking the taylor RPC with an exact polynomial
 *   and checking residual < tolerance via evalPoly().
 *
 * Invariant 2 — Finite-difference consistency:
 *   (f(x+h) - f(x)) / h → f'(x) as h → 0
 *   Verified by comparing a central-difference approximation of a SymPy
 *   expression against the mocked symbolic derivative at multiple points.
 *
 * Both invariants test that the block pipeline is wired correctly:
 * the FunctionPayload round-trips through compute → evaluate without loss.
 *
 * @cross-engine
 */

import { evaluate as mathjsEvaluate } from "mathjs";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { FunctionPayload, MathValue } from "~/math/types";
import { computeDerivative } from "./derivative/compute";
import { computeTaylor } from "./taylor/compute";

vi.mock("~/engine/workers/pyodide.client", () => ({
  diff: vi.fn(),
  taylor: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

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

/**
 * Evaluates a SymPy-style polynomial string at a numeric point.
 * Translates SymPy notation (x**n) to JS (Math.pow(x,n)) for evaluation.
 */
function evalPoly(sympyExpr: string, varName: string, value: number): number {
  const jsExpr = sympyExpr
    .replace(/(\w+)\*\*(\d+)/g, "Math.pow($1,$2)")
    .replace(/exp\(([^)]+)\)/g, "Math.exp($1)");
  // eslint-disable-next-line no-new-func
  return new Function(varName, `return ${jsExpr};`)(value) as number;
}

/** Evaluates a mathjs-compatible expression at a numeric point. */
function evalMathjs(expr: string, varName: string, value: number): number {
  try {
    const result = mathjsEvaluate(expr, { [varName]: value });
    if (typeof result !== "number" || !Number.isFinite(result)) return NaN;
    return result;
  } catch {
    return NaN;
  }
}

/** Build the order-N Taylor polynomial string for exp(x) = Σ x^k/k! */
function expTaylorPoly(order: number): string {
  const terms: string[] = [];
  let factorial = 1;
  for (let k = 0; k <= order; k++) {
    if (k > 0) factorial *= k;
    if (k === 0) terms.push("1");
    else if (k === 1) terms.push("x");
    else terms.push(`x**${k}/${factorial}`);
  }
  return terms.join(" + ");
}

/** Build the order-N Taylor polynomial string for sin(x) = Σ (-1)^k x^(2k+1)/(2k+1)! */
function sinTaylorPoly(order: number): string {
  const terms: string[] = [];
  let factorial = 1;
  for (let k = 0; k <= order; k++) {
    if (k > 0) factorial *= k;
    if (k % 2 === 1) {
      const sign = ((k - 1) / 2) % 2 === 0 ? "+" : "-";
      terms.push(`${sign} x**${k}/${factorial}`);
    }
  }
  return terms.join(" ").replace(/^\+ /, "");
}

// ─────────────────────────────────────────────────────────────
// Invariant 1 — Taylor convergence
// ─────────────────────────────────────────────────────────────
describe("Invariant: taylor(f, 0, n).evaluate(x) → f(x) as n → large", () => {
  const TOL = 1e-9;

  test("exp(x): order-30 polynomial matches Math.exp at x=0.5 within 1e-9", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue(expTaylorPoly(30));

    const result = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 30 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", 0.5);
    expect(Math.abs(approx - Math.exp(0.5))).toBeLessThan(TOL);
  });

  test("exp(x): order-30 polynomial matches Math.exp at x=-1 within 1e-9", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue(expTaylorPoly(30));

    const result = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 30 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", -1);
    expect(Math.abs(approx - Math.exp(-1))).toBeLessThan(TOL);
  });

  test("sin(x): order-29 polynomial matches Math.sin at x=0.3 within 1e-9", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue(sinTaylorPoly(29));

    const result = await computeTaylor(
      { fn: makeFnInput("sin(x)") },
      { variable: "x", center: 0, order: 29 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", 0.3);
    expect(Math.abs(approx - Math.sin(0.3))).toBeLessThan(TOL);
  });

  test("sin(x): order-29 polynomial matches Math.sin at x=1.2 within 1e-9", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");
    vi.mocked(taylor).mockResolvedValue(sinTaylorPoly(29));

    const result = await computeTaylor(
      { fn: makeFnInput("sin(x)") },
      { variable: "x", center: 0, order: 29 },
    );
    const payload = result.payload as unknown as FunctionPayload;

    const approx = evalPoly(payload.expression, "x", 1.2);
    expect(Math.abs(approx - Math.sin(1.2))).toBeLessThan(TOL);
  });

  test("higher-order polynomial is closer: error(order=10) < error(order=4) for exp(0.5)", async () => {
    const { taylor } = await import("~/engine/workers/pyodide.client");

    vi.mocked(taylor).mockResolvedValueOnce(expTaylorPoly(4));
    const result4 = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 4 },
    );
    const payload4 = result4.payload as unknown as FunctionPayload;
    const err4 = Math.abs(evalPoly(payload4.expression, "x", 0.5) - Math.exp(0.5));

    vi.mocked(taylor).mockResolvedValueOnce(expTaylorPoly(10));
    const result10 = await computeTaylor(
      { fn: makeFnInput("exp(x)") },
      { variable: "x", center: 0, order: 10 },
    );
    const payload10 = result10.payload as unknown as FunctionPayload;
    const err10 = Math.abs(evalPoly(payload10.expression, "x", 0.5) - Math.exp(0.5));

    expect(err10).toBeLessThan(err4);
  });
});

// ─────────────────────────────────────────────────────────────
// Invariant 2 — Finite-difference consistency
// ─────────────────────────────────────────────────────────────
describe("Invariant: (f(x+h) - f(x)) / h → f'(x) as h → 0", () => {
  const CONVERGENCE_TOL = 1e-4;

  /**
   * Central-difference approximation using mathjs-compatible expressions.
   * h=1e-6 gives ~1e-10 error for smooth functions.
   */
  function centralDiff(expr: string, variable: string, x: number): number {
    const h = 1e-6;
    const fHi = evalMathjs(expr, variable, x + h);
    const fLo = evalMathjs(expr, variable, x - h);
    return (fHi - fLo) / (2 * h);
  }

  test("d/dx[sin(x)] = cos(x): finite diff agrees at x=0, π/4, π/2 within 1e-4", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("cos(x)");

    const result = await computeDerivative({ fn: makeFnInput("sin(x)") }, { variable: "x" });
    const derivPayload = result.payload as unknown as FunctionPayload;

    for (const x of [0, Math.PI / 4, Math.PI / 2]) {
      const symbolicDeriv = evalMathjs(derivPayload.expression, "x", x);
      const finiteDeriv = centralDiff("sin(x)", "x", x);
      expect(Math.abs(finiteDeriv - symbolicDeriv)).toBeLessThan(CONVERGENCE_TOL);
    }
  });

  test("d/dx[exp(x)] = exp(x): finite diff agrees at x=0, 1, -1 within 1e-4", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("exp(x)");

    const result = await computeDerivative({ fn: makeFnInput("exp(x)") }, { variable: "x" });
    const derivPayload = result.payload as unknown as FunctionPayload;

    for (const x of [0, 1, -1]) {
      const symbolicDeriv = evalMathjs(derivPayload.expression, "x", x);
      const finiteDeriv = centralDiff("exp(x)", "x", x);
      expect(Math.abs(finiteDeriv - symbolicDeriv)).toBeLessThan(CONVERGENCE_TOL);
    }
  });

  test("d/dx[cos(x)] = -sin(x): finite diff agrees at x=0, π/3, π within 1e-4", async () => {
    const { diff } = await import("~/engine/workers/pyodide.client");
    vi.mocked(diff).mockResolvedValue("-sin(x)");

    const result = await computeDerivative({ fn: makeFnInput("cos(x)") }, { variable: "x" });
    const derivPayload = result.payload as unknown as FunctionPayload;

    for (const x of [0, Math.PI / 3, Math.PI]) {
      const symbolicDeriv = evalMathjs(derivPayload.expression, "x", x);
      const finiteDeriv = centralDiff("cos(x)", "x", x);
      expect(Math.abs(finiteDeriv - symbolicDeriv)).toBeLessThan(CONVERGENCE_TOL);
    }
  });

  test("h-refinement: error(h=1e-3) > error(h=1e-6) for d/dx[sin(x)] at x=1", () => {
    const x = 1;
    const exact = Math.cos(x);

    const coarseH = 1e-3;
    const fineH = 1e-6;
    const errCoarse = Math.abs(
      (evalMathjs("sin(x)", "x", x + coarseH) - evalMathjs("sin(x)", "x", x - coarseH)) /
        (2 * coarseH) -
        exact,
    );
    const errFine = Math.abs(
      (evalMathjs("sin(x)", "x", x + fineH) - evalMathjs("sin(x)", "x", x - fineH)) / (2 * fineH) -
        exact,
    );

    expect(errFine).toBeLessThan(errCoarse);
  });
});
