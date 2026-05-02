import type { BlockDefinition } from "~/blocks/types";
import { computeTrace } from "./compute";

export const TraceBlock: BlockDefinition = {
  id: "la.trace",
  label: "Matrix trace",
  symbol: "tr(A)",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "A",
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "tr",
      label: "tr(A)",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  compute: (inputs) => computeTrace(inputs),
  explain: {
    what: "Computes the sum of the main diagonal entries of a square matrix.",
    why: "The trace equals the sum of eigenvalues, is invariant under cyclic permutation of products (tr(AB)=tr(BA)), and appears in characteristic polynomials, covariance matrices, and nuclear norms.",
    effect: () => "Output is a scalar.",
    impact: () =>
      "Downstream blocks receive a single real number equal to the sum of diagonal entries.",
  },
};
