import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalExpr1d, numericalDerivative1d } from "./eval";

export class NewtonRootError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewtonRootError";
  }
}

export const NewtonRootBlock: BlockDefinition = {
  id: "opt.newton-root",
  label: "Newton Root",
  symbol: "N→0",
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
      label: "x₀ (initial guess)",
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

    if (fn === undefined) throw new NewtonRootError("opt.newton-root: function fn is required");
    if (x0Val === undefined)
      throw new NewtonRootError("opt.newton-root: initial guess x0 is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    let x = x0Val.payload as number;
    const tol = typeof params.tolerance === "number" ? params.tolerance : 1e-10;
    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 100;

    for (let i = 0; i < maxIter; i++) {
      const fx = evalExpr1d(expression, variable, x);
      if (Math.abs(fx) < tol) break;
      const dfx = numericalDerivative1d(expression, variable, x);
      if (Math.abs(dfx) < 1e-14) break; // avoid division by near-zero derivative
      x -= fx / dfx;
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: x,
      provenance: {
        blockId: "opt.newton-root",
        inputs: ["fn", "x0"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Finds a root of f(x) using Newton's method: xₙ₊₁ = xₙ − f(xₙ)/f'(xₙ). Derivative is computed numerically via central finite differences.",
    why: "Newton's method has quadratic convergence near a simple root — it roughly doubles the number of correct digits per iteration. Faster than bisection but requires a good initial guess.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect function f and initial guess x₀.";
      return `Newton root-finding from x₀ = ${inputs.x0.payload as number}...`;
    },
    impact: (_inputs, output) => `Root at x = ${(output.payload as number).toPrecision(10)}.`,
  },
};
