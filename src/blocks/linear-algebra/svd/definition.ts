import type { BlockDefinition } from "~/blocks/types";
import { computeSvd } from "./compute";

export const SvdBlock: BlockDefinition = {
  id: "la.svd",
  label: "SVD",
  symbol: "SVD(A)",
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
      id: "USV",
      label: "U, S, V",
      // Single structured output: Tuple<Matrix<m,m>, Vector<k>, Matrix<n,n>>
      // where k = min(m,n). Same single-output design as la.lu / la.qr.
      // U is m×m orthogonal, S holds k singular values in descending order,
      // V is n×n orthogonal. Reconstruction: U·diag(S)·Vᵀ ≈ A.
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Matrix", m: { var: "m" }, n: { var: "m" }, field: "real" },
          { kind: "Vector", n: "any", field: "real" },
          { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
        ],
      },
    },
  ],
  compute: (inputs) => computeSvd(inputs),
  explain: {
    what: "Computes the singular value decomposition: A = U·diag(S)·Vᵀ where U (m×m) and V (n×n) are orthogonal and S holds the singular values in descending order.",
    why: "SVD is the most informative matrix factorisation: it reveals the rank, null space, range, and condition number of A. It underpins PCA, least-squares, pseudo-inverse, low-rank approximation, and image compression.",
    effect: () =>
      "Output is a structured {U, S, V} tuple. U is m×m orthogonal; S is a vector of k = min(m,n) singular values (σ₁ ≥ σ₂ ≥ … ≥ 0); V is n×n orthogonal.",
    impact: () =>
      "A ≈ U·diag(S)·Vᵀ up to floating-point precision (~1e-6). Singular values equal zero for rank-deficient A.",
  },
};
