import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalExpr1d } from "./eval";

export class SecantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecantError";
  }
}

export const SecantBlock: BlockDefinition = {
  id: "opt.secant",
  label: "Secant",
  symbol: "⟨x₀,x₁⟩",
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
      id: "x0",
      label: "x₀ (first guess)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    {
      id: "x1",
      label: "x₁ (second guess)",
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
    const x0Val = inputs.x0;
    const x1Val = inputs.x1;

    if (fn === undefined) throw new SecantError("opt.secant: function fn is required");
    if (x0Val === undefined) throw new SecantError("opt.secant: first guess x0 is required");
    if (x1Val === undefined) throw new SecantError("opt.secant: second guess x1 is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    let x0 = x0Val.payload as number;
    let x1 = x1Val.payload as number;
    const tol = typeof params.tolerance === "number" ? params.tolerance : 1e-10;
    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 100;

    let f0 = evalExpr1d(expression, variable, x0);
    let f1 = evalExpr1d(expression, variable, x1);

    for (let i = 0; i < maxIter; i++) {
      if (Math.abs(f1) < tol) break;
      const denom = f1 - f0;
      if (Math.abs(denom) < 1e-14) break;
      const x2 = x1 - (f1 * (x1 - x0)) / denom;
      x0 = x1;
      f0 = f1;
      x1 = x2;
      f1 = evalExpr1d(expression, variable, x1);
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: x1,
      provenance: {
        blockId: "opt.secant",
        inputs: ["fn", "x0", "x1"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Finds a root of f(x) using the secant method. Approximates the derivative via a finite difference between the last two iterates. No bracketing required.",
    why: "The secant method achieves superlinear convergence (~1.618x digits per step) without computing derivatives, making it faster than bisection while being derivative-free.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined || inputs.x1 === undefined)
        return "Connect function f and two initial guesses x₀, x₁.";
      return `Secant root-finding from [${inputs.x0.payload as number}, ${inputs.x1.payload as number}]...`;
    },
    impact: (_inputs, output) => `Root at x = ${(output.payload as number).toPrecision(10)}.`,
  },
};
