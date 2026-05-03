import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeDerivative } from "./compute";

export const DerivativeBlock: BlockDefinition = {
  id: "calc.derivative",
  label: "Derivative",
  symbol: "d/dx",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [
    {
      id: "fn",
      label: "f(x)",
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
      label: "f'(x)",
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
      default: "",
      label: "Variable (blank = infer from input)",
    },
  },
  compute: (inputs, params) => computeDerivative(inputs, params),
  explain: {
    what: "Computes the symbolic derivative df/dx via SymPy diff(). Higher-order derivatives are achieved by chaining derivative blocks.",
    why: "Symbolic differentiation yields exact closed-form derivatives rather than finite-difference approximations, enabling downstream blocks (tangent lines, critical points) to reason exactly.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      const v = payload.variables[0] ?? "x";
      return `f'(${v}) = ${payload.expression}`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `Derivative: ${payload.expression}`;
    },
  },
};
