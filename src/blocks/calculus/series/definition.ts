import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload } from "~/math/types";
import { computeSeries } from "./compute";

export const SeriesBlock: BlockDefinition = {
  id: "calc.series",
  label: "Series Sum",
  symbol: "Σ",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [
    {
      id: "fn",
      label: "aₙ (general term)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "from",
      label: "From (lower index)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "to",
      label: "To (upper index)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "value",
      label: "Σ aₙ",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    from: {
      kind: "integer",
      default: 0,
      label: "From n =",
    },
    to: {
      kind: "integer",
      default: 10,
      label: "To n =",
    },
    index: {
      kind: "string",
      default: "",
      label: "Index variable (blank = infer from input)",
    },
  },
  compute: (inputs, params) => computeSeries(inputs, params),
  explain: {
    what: "Computes the partial sum Σ_{n=from}^{to} aₙ symbolically via SymPy Sum().doit(). Returns a Scalar for numeric sums or a symbolic Function for parametric terms.",
    why: "Partial sums let you explore convergence empirically by connecting the upper bound to a slider. Use with viz.taylor or a custom graph for convergence visualisation.",
    effect: (_inputs, output) => {
      if (output.type.kind === "Scalar") {
        const val = typeof output.payload === "number" ? output.payload.toPrecision(6) : "?";
        return `Σ aₙ = ${val}`;
      }
      const payload = output.payload as unknown as FunctionPayload;
      return `Σ aₙ = ${payload.expression}`;
    },
    impact: (_inputs, output) => {
      if (output.type.kind === "Scalar") {
        return `Partial sum: ${output.payload}`;
      }
      const payload = output.payload as unknown as FunctionPayload;
      return `Partial sum: ${payload.expression}`;
    },
  },
};
