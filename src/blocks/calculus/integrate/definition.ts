import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeIntegrate } from "./compute";

export const IntegrateBlock: BlockDefinition = {
  id: "calc.integrate",
  label: "Indefinite Integral",
  symbol: "∫f dx",
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
      label: "∫f dx",
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
  compute: (inputs, params) => computeIntegrate(inputs, params),
  explain: {
    what: "Computes the indefinite integral ∫f(x) dx symbolically via SymPy integrate(). No constant of integration is added — SymPy returns the canonical antiderivative.",
    why: "Symbolic integration preserves exactness. Chain with calc.definite-integrate to evaluate at bounds, or differentiate to verify the fundamental theorem.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      const v = payload.variables[0] ?? "x";
      return `∫f(${v}) d${v} = ${payload.expression}`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `Antiderivative: ${payload.expression}`;
    },
  },
};
