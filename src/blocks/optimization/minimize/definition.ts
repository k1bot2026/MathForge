import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";
import { BfgsBlock } from "../bfgs/definition";
import { GradientDescentBlock } from "../gradient-descent/definition";
import { NewtonOptBlock } from "../newton/definition";

export class MinimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MinimizeError";
  }
}

export const MinimizeBlock: BlockDefinition = {
  id: "opt.minimize",
  label: "Minimize",
  symbol: "min",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "fn",
      label: "f (objective)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "x0",
      label: "x₀ (initial point)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "result",
      label: "Result",
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: "any", field: "real" },
          { kind: "Scalar", field: "real", precision: "approximate" },
        ],
      },
    },
  ],
  params: {
    method: {
      kind: "select",
      options: ["bfgs", "gradient-descent", "newton"],
      default: "bfgs",
      label: "Method",
    },
  },
  compute(inputs, params, ctx): MathValue {
    const fn = inputs.fn;
    const x0 = inputs.x0;

    if (fn === undefined)
      throw new MinimizeError("opt.minimize: objective function fn is required");
    if (x0 === undefined) throw new MinimizeError("opt.minimize: initial point x0 is required");

    const method = typeof params.method === "string" ? params.method : "bfgs";

    const delegateParams = { max_iter: 1000, tolerance: 1e-8 };

    switch (method) {
      case "gradient-descent":
        return GradientDescentBlock.compute(
          inputs,
          { ...delegateParams, learning_rate: 0.01 },
          ctx,
        ) as MathValue;
      case "newton":
        return NewtonOptBlock.compute(inputs, delegateParams, ctx) as MathValue;
      default:
        return BfgsBlock.compute(inputs, delegateParams, ctx) as MathValue;
    }
  },
  explain: {
    what: "Dispatches to a chosen minimization algorithm (BFGS, gradient descent, or Newton's method). All methods accept a Function f and initial point x₀; the method param selects the solver.",
    why: "A single entry point for unconstrained minimization makes it easy to swap solvers without rewiring. BFGS is the default — it has superlinear convergence and works well on smooth objectives.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect a Function and initial Vector x₀.";
      const fnPayload = inputs.fn.payload as unknown as FunctionPayload;
      const n = fnPayload.variables.length;
      return `Minimizing f: ℝ${n} → ℝ. Select method in params.`;
    },
    impact: (_inputs, output) => {
      const [xOut, valOut] = output.payload as [MathValue, MathValue];
      const n = xOut ? (xOut.payload as VectorPayload).length : 0;
      const val = valOut ? (valOut.payload as number) : 0;
      return `Minimum x ∈ ℝ${n}, f(x*) = ${val.toPrecision(6)}.`;
    },
  },
};
