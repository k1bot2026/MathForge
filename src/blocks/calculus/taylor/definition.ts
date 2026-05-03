import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeTaylor } from "./compute";

export const TaylorBlock: BlockDefinition = {
  id: "calc.taylor",
  label: "Taylor Series",
  symbol: "Tₙ(x)",
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
    {
      id: "center",
      label: "Center a",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "order",
      label: "Order n",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "fn",
      label: "Tₙ(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {
    center: {
      kind: "number",
      default: 0,
      label: "Center a",
    },
    order: {
      kind: "integer",
      default: 5,
      min: 1,
      max: 20,
      label: "Order n",
    },
    variable: {
      kind: "string",
      default: "",
      label: "Variable (blank = infer from input)",
    },
  },
  compute: (inputs, params) => computeTaylor(inputs, params),
  explain: {
    what: "Computes the degree-n Taylor polynomial of f around x=a via SymPy series().removeO(). The O(xⁿ) term is removed so the output is a polynomial Function.",
    why: "Taylor polynomials approximate smooth functions near a point. Increasing order improves accuracy; connect viz.taylor to visualise convergence — the Phase 4 exit-criterion demo.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      const v = payload.variables[0] ?? "x";
      return `T(${v}) = ${payload.expression}`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      return `Polynomial approximation: ${payload.expression}`;
    },
  },
};
