import type { BlockDefinition } from "~/blocks/types";
import { computeRank } from "./compute";

export const RankBlock: BlockDefinition = {
  id: "la.rank",
  label: "Matrix rank",
  symbol: "rank(A)",
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
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "rank",
      label: "rank(A)",
      type: { kind: "Scalar", field: "integer", precision: "exact" },
    },
  ],
  compute: (inputs) => computeRank(inputs),
  explain: {
    what: "Counts the number of linearly independent rows (or columns) in a matrix by computing RREF and counting non-zero rows.",
    why: "Rank reveals the dimension of the column space and row space — essential for understanding a linear system's solvability (full rank = unique solution or no solution; rank-deficient = infinitely many).",
    effect: () => "Output is an exact non-negative integer.",
    impact: () =>
      "Downstream blocks receive a scalar integer in [0, min(m, n)]. A rank of min(m, n) means the matrix has full rank.",
  },
};
