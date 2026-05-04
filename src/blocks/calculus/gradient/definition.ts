import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeGradient } from "./compute";

export const GradientBlock: BlockDefinition = {
  id: "calc.gradient",
  label: "Gradient",
  symbol: "∇f",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [
    {
      id: "fn",
      label: "f(x₁,…,xₙ)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  outputs: [
    {
      id: "gradient",
      label: "∇f",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  compute: (inputs, params) => computeGradient(inputs, params),
  explain: {
    what: "Computes the gradient ∇f = [∂f/∂x₁, …, ∂f/∂xₙ] by differentiating with respect to each variable in the FunctionPayload variables list. Returns a Vector of approximate reals.",
    why: "The gradient points in the direction of steepest ascent. Use with viz.vector-field to visualise the gradient field, or pass to an optimiser to implement gradient descent.",
    effect: (inputs, output) => {
      const fn = inputs.fn;
      if (fn === undefined) return "Connect a multivariate Function to compute its gradient.";
      const fnPayload = fn.payload as unknown as FunctionPayload;
      const vars = [...fnPayload.variables].join(", ");
      const components = output.payload as unknown as number[];
      const formatted = components
        .map((c) => (Number.isFinite(c) ? c.toPrecision(4) : "symbolic"))
        .join(", ");
      return `∇f(${vars}) = [${formatted}]`;
    },
  },
};
