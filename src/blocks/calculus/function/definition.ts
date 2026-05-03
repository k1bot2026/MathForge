import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeFunction } from "./compute";

export const FunctionBlock: BlockDefinition = {
  id: "calc.function",
  label: "Function",
  symbol: "f(x)",
  category: "source",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [],
  outputs: [
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
  params: {
    expression: {
      kind: "string",
      default: "sin(x)",
      label: "f(x) =",
    },
    variable: {
      kind: "string",
      default: "x",
      label: "Variable",
    },
  },
  compute: (inputs, params) => computeFunction(inputs, params),
  explain: {
    what: "Defines a single-variable real function f(x) from a symbolic expression. The expression is validated and normalised via SymPy sympify().",
    why: "A typed Function value lets downstream calc.* blocks (derivative, integral, limit, Taylor) work symbolically rather than numerically, preserving exactness.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `f(${payload.variables[0]}) = ${payload.expression}`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `Canonical SymPy form: ${payload.expression}. Variable: ${payload.variables[0]}.`;
    },
  },
};
