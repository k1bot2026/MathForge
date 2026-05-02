import type { BlockDefinition } from "~/blocks/types";
import { computeDet } from "./compute";

export const DetBlock: BlockDefinition = {
  id: "la.det",
  label: "Determinant",
  symbol: "det(A)",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "mathjs",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "A",
      // Square matrix: same shape variable for rows and columns.
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "det",
      label: "det(A)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  compute: (inputs) => computeDet(inputs),
  explain: {
    what: "Computes the determinant of a square matrix using LU decomposition.",
    why: "The determinant encodes whether a linear map is invertible (det ≠ 0), scales volumes by |det|, and equals the product of all eigenvalues — making it essential for solving linear systems and computing characteristic polynomials.",
    effect: () => "Output is a scalar (approximate floating-point).",
    impact: () =>
      "Downstream blocks receive a single real number. For integers up to 3×3, the value is exact; for larger matrices floating-point rounding applies.",
  },
};
