import type { BlockDefinition } from "~/blocks/types";
import { computeQr } from "./compute";

export const QrBlock: BlockDefinition = {
  id: "la.qr",
  label: "QR decomposition",
  symbol: "QR(A)",
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
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "QR",
      label: "Q, R",
      // Single structured output: Tuple<Matrix<m,m>, Matrix<m,n>>.
      // Q is always m×m orthogonal; R is m×n upper-triangular.
      // Same single-output design as la.lu — see that block's commit message.
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Matrix", m: { var: "m" }, n: { var: "m" }, field: "real" },
          { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
        ],
      },
    },
  ],
  compute: (inputs) => computeQr(inputs),
  explain: {
    what: "Computes the QR decomposition: A = Q·R where Q is an orthogonal matrix (Qᵀ·Q = I) and R is upper-triangular.",
    why: "QR factorisation is numerically stable and underpins least-squares solvers, eigenvalue algorithms (QR iteration), and Gram-Schmidt orthogonalisation. It works for non-square (m≥n) matrices.",
    effect: () =>
      "Output is a structured {Q, R} tuple. Q is m×m orthogonal; R is m×n upper-triangular (tolerance 1e-6).",
    impact: () =>
      "A = Q·R exactly up to floating-point precision (~1e-6). Downstream blocks access sub-matrices via extraction.",
  },
};
