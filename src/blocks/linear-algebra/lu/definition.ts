import type { BlockDefinition } from "~/blocks/types";
import { computeLu } from "./compute";

export const LuBlock: BlockDefinition = {
  id: "la.lu",
  label: "LU decomposition",
  symbol: "LU(A)",
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
      // Square matrix constraint via shared shape var.
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "LUP",
      label: "L, U, P",
      // Single structured output: Tuple<Matrix, Matrix, Matrix>.
      // Design note: the evaluator supports only one MathValue per block output;
      // rather than three separate output ports (which would require evaluator changes),
      // L/U/P are packed into a Tuple payload and accessed as { L, U, P } downstream.
      // See compute.ts for the LuPayload type.
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
          { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
          { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
        ],
      },
    },
  ],
  compute: (inputs) => computeLu(inputs),
  explain: {
    what: "Computes the LU decomposition with partial pivoting: PA = LU where P is a permutation matrix, L is lower-triangular with unit diagonal, and U is upper-triangular.",
    why: "LUP factorisation is the foundation of direct linear solvers — it reduces Ax=b to two triangular systems (Ly=Pb, Ux=y), each solvable in O(n²). It also underlies det computation and matrix inversion.",
    effect: () =>
      "Output is a structured {L, U, P} tuple. Access sub-matrices from downstream extraction blocks.",
    impact: () =>
      "P·A = L·U exactly (up to floating-point precision). L has 1s on the diagonal; U has the pivots.",
  },
};
