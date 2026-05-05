import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalExpr1d } from "./eval";

export class BisectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BisectionError";
  }
}

export const BisectionBlock: BlockDefinition = {
  id: "opt.bisection",
  label: "Bisection",
  symbol: "⟨a,b⟩",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "fn",
      label: "f (function)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "a",
      label: "a (left bound)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    {
      id: "b",
      label: "b (right bound)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  outputs: [
    {
      id: "root",
      label: "Root",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    tolerance: { kind: "number", default: 1e-10, min: 1e-15, max: 1, label: "Tolerance" },
    max_iter: { kind: "integer", default: 100, min: 1, max: 10_000, label: "Max Iterations" },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const aVal = inputs.a;
    const bVal = inputs.b;

    if (fn === undefined) throw new BisectionError("opt.bisection: function fn is required");
    if (aVal === undefined) throw new BisectionError("opt.bisection: left bound a is required");
    if (bVal === undefined) throw new BisectionError("opt.bisection: right bound b is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    let a = aVal.payload as number;
    let b = bVal.payload as number;
    const tol = typeof params.tolerance === "number" ? params.tolerance : 1e-10;
    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 100;

    let fa = evalExpr1d(expression, variable, a);
    const fb = evalExpr1d(expression, variable, b);

    if (fa * fb > 0) {
      throw new BisectionError(
        `opt.bisection: f(a) and f(b) must have opposite signs. f(${a})=${fa}, f(${b})=${fb}`,
      );
    }

    for (let i = 0; i < maxIter; i++) {
      const mid = (a + b) / 2;
      if (b - a < tol) break;
      const fm = evalExpr1d(expression, variable, mid);
      if (fa * fm <= 0) {
        b = mid;
      } else {
        a = mid;
        fa = fm;
      }
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: (a + b) / 2,
      provenance: {
        blockId: "opt.bisection",
        inputs: ["fn", "a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Finds a root of f(x) in [a, b] using the bisection method. Requires f(a) and f(b) to have opposite signs (Intermediate Value Theorem). Halves the interval at each step.",
    why: "Bisection is guaranteed to converge (given a sign change) and is immune to issues like zero derivatives. Trade-off: linear convergence — slower than Newton or secant but completely reliable.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.a === undefined || inputs.b === undefined)
        return "Connect function f, and bounds a, b with f(a)·f(b) < 0.";
      const a = inputs.a.payload as number;
      const b = inputs.b.payload as number;
      return `Bisecting f on [${a}, ${b}]...`;
    },
    impact: (_inputs, output) => `Root at x = ${(output.payload as number).toPrecision(10)}.`,
  },
};
