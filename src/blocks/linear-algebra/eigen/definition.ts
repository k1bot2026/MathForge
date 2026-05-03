import type { BlockDefinition } from "~/blocks/types";
import { computeEigen } from "./compute";
import { EigenPreviewRenderer } from "./eigen-preview";

export const EigenBlock: BlockDefinition = {
  id: "la.eigen",
  label: "Eigendecomposition",
  symbol: "eig(A)",
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
      // Square matrix constraint.
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "eigenpairs",
      label: "λ, V",
      // Tuple<Vector<n> of eigenvalues, Matrix<n,n> of eigenvectors (columns)>.
      // Eigenvector layout: column k of V is the eigenvector for eigenvalues[k].
      // This column-major layout is viz.eigenvector-highlight-friendly.
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: { var: "n" }, field: "real" },
          { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
        ],
      },
    },
  ],
  compute: (inputs) => computeEigen(inputs),
  previewRenderer: EigenPreviewRenderer,
  explain: {
    what: "Computes the eigendecomposition of a square matrix: returns eigenvalues λ and a matrix V whose columns are the corresponding eigenvectors.",
    why: "Eigendecomposition diagonalises a matrix (A = VΛV⁻¹ for diagonalisable A), revealing the directions along which the transformation only scales, not rotates. It underpins PCA, Markov chains, Google PageRank, and quantum mechanics.",
    effect: () =>
      "Output is {eigenvalues: number[], eigenvectors: Matrix<n,n>}. Column k of the eigenvector matrix corresponds to eigenvalues[k]. Throws a typed error if A has complex eigenvalues.",
    impact: () =>
      "Downstream viz.eigenvector-highlight can extract column k to render the kth eigenvector on the canvas. For symmetric matrices, eigenvectors are orthonormal.",
  },
};
