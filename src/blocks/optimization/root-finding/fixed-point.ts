import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalExpr1d } from "./eval";

export class FixedPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FixedPointError";
  }
}

export const FixedPointBlock: BlockDefinition = {
  id: "opt.fixed-point",
  label: "Fixed Point",
  symbol: "g(x*)=x*",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "fn",
      label: "g (iteration function)",
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
      id: "fixed_point",
      label: "Fixed point x*",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    tolerance: { kind: "number", default: 1e-10, min: 1e-15, max: 1, label: "Tolerance" },
    max_iter: { kind: "integer", default: 1000, min: 1, max: 100_000, label: "Max Iterations" },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const x0Val = inputs.x0;

    if (fn === undefined)
      throw new FixedPointError("opt.fixed-point: iteration function fn is required");
    if (x0Val === undefined)
      throw new FixedPointError("opt.fixed-point: initial guess x0 is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    let x = x0Val.payload as number;
    const tol = typeof params.tolerance === "number" ? params.tolerance : 1e-10;
    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 1000;

    for (let i = 0; i < maxIter; i++) {
      const xNew = evalExpr1d(expression, variable, x);
      if (Math.abs(xNew - x) < tol) {
        x = xNew;
        break;
      }
      x = xNew;
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: x,
      provenance: {
        blockId: "opt.fixed-point",
        inputs: ["fn", "x0"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Finds a fixed point x* of g(x) by iterating xₙ₊₁ = g(xₙ) until |xₙ₊₁ − xₙ| < tolerance. Converges when |g'(x*)| < 1 (contraction mapping theorem).",
    why: "Fixed-point iteration is the simplest iterative method. It directly encodes the structure of many algorithms (e.g., PageRank, Jacobi solver). Finds f(x)=0 roots via g(x) = x − f(x)/f'(x) (Newton form) or other reformulations.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect iteration function g and initial guess x₀.";
      return `Fixed-point iteration from x₀ = ${inputs.x0.payload as number}...`;
    },
    impact: (_inputs, output) => `Fixed point x* = ${(output.payload as number).toPrecision(10)}.`,
  },
};
