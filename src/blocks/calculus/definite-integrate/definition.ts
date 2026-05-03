import type { BlockDefinition } from "~/blocks/types";
import { computeDefiniteIntegrate } from "./compute";

export const DefiniteIntegrateBlock: BlockDefinition = {
  id: "calc.definite-integrate",
  label: "Definite Integral",
  symbol: "∫ₐᵇ",
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
      id: "a",
      label: "Lower bound a",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "b",
      label: "Upper bound b",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "value",
      label: "∫ₐᵇ f(x) dx",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    a: {
      kind: "number",
      default: 0,
      label: "Lower bound a",
    },
    b: {
      kind: "number",
      default: 1,
      label: "Upper bound b",
    },
    variable: {
      kind: "string",
      default: "",
      label: "Variable (blank = infer from input)",
    },
  },
  compute: (inputs, params) => computeDefiniteIntegrate(inputs, params),
  explain: {
    what: "Computes ∫ₐᵇ f(x) dx numerically via SymPy N(integrate(f, (x, a, b))). Returns an approximate real scalar.",
    why: "Definite integrals give areas, accumulated change, and expected values. Connecting bound inputs from upstream Scalar blocks lets you parameterise the integration region dynamically.",
    effect: (_inputs, output) => {
      const val = typeof output.payload === "number" ? output.payload.toPrecision(6) : "?";
      return `∫ₐᵇ f dx = ${val}`;
    },
    impact: (_inputs, output) => {
      const val = typeof output.payload === "number" ? output.payload : "?";
      return `Result: ${val}`;
    },
  },
};
