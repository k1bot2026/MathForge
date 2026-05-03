import type { BlockDefinition } from "~/blocks/types";
import type { ExpressionPayload } from "~/math/types";
import { computeLimit } from "./compute";

export const LimitBlock: BlockDefinition = {
  id: "calc.limit",
  label: "Limit",
  symbol: "lim",
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
      id: "point",
      label: "Point c",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "value",
      label: "lim f(x)",
      type: { kind: "Expression", freeVars: [] },
    },
  ],
  params: {
    point: {
      kind: "number",
      default: 0,
      label: "Point c (x → c)",
    },
    variable: {
      kind: "string",
      default: "",
      label: "Variable (blank = infer from input)",
    },
  },
  compute: (inputs, params) => computeLimit(inputs, params),
  explain: {
    what: "Computes lim_{x→c} f(x) symbolically via SymPy limit(). Returns a Scalar for finite numeric results, or an Expression for symbolic answers (oo, zoo, etc.).",
    why: "Symbolic limits handle indeterminate forms (0/0, ∞/∞) that numerical evaluation cannot. Set point to 'oo' via the variable param for limits at infinity.",
    effect: (_inputs, output) => {
      if (output.type.kind === "Scalar") {
        const val = typeof output.payload === "number" ? output.payload : "?";
        return `lim f = ${val}`;
      }
      const payload = output.payload as unknown as ExpressionPayload;
      return `lim f = ${payload.serialized}`;
    },
    impact: (_inputs, output) => {
      if (output.type.kind === "Scalar") {
        return `Limit: ${output.payload}`;
      }
      const payload = output.payload as unknown as ExpressionPayload;
      return `Limit: ${payload.serialized}`;
    },
  },
};
