import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computePartial } from "./compute";

export const PartialBlock: BlockDefinition = {
  id: "calc.partial",
  label: "Partial Derivative",
  symbol: "∂/∂x",
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
      id: "fn",
      label: "∂f/∂xᵢ",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {
    variable: {
      kind: "string",
      default: "x",
      label: "Differentiate with respect to",
    },
  },
  compute: (inputs, params) => computePartial(inputs, params),
  explain: {
    what: "Computes the partial derivative ∂f/∂xᵢ via SymPy diff(). Specify which variable to differentiate with respect to in the param; all other variables are treated as constants.",
    why: "Partial derivatives measure how a function changes along one variable axis while holding all others fixed. Used by calc.gradient to assemble the full gradient vector.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      const v = payload.variables[0] ?? "x";
      return `∂f/∂? = ${payload.expression} (vars: ${[...payload.variables].join(", ")} → holds ${[...payload.variables].filter((u) => u !== v).join(", ")} constant)`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `Partial: ${payload.expression}`;
    },
  },
};
