import type { BlockDefinition } from "~/blocks/types";
import { computeSolve } from "./compute";

export const SolveBlock: BlockDefinition = {
  id: "la.solve",
  label: "Linear Solve",
  symbol: "solve(A,b)",
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
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
    {
      id: "b",
      label: "b",
      type: { kind: "Vector", n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "x",
      label: "x",
      type: { kind: "Vector", n: { var: "n" }, field: "real" },
    },
  ],
  compute: (inputs) => computeSolve(inputs),
  explain: {
    what: "Solves the linear system Ax = b for x, returning the unique solution vector.",
    why: "Direct solution of linear systems is the core of numerical linear algebra — it underlies least-squares fitting, finite element methods, circuit analysis, and virtually every engineering simulation.",
    effect: () =>
      "Returns Vector<n> x such that A·x = b. Throws a typed SolveError if A is singular (|det A| < 1e-10) or if the system is inconsistent.",
    impact: () =>
      "Connects to any downstream block that consumes Vector<n>. Pair with la.matmul or la.matvec to verify A·x = b on the canvas.",
  },
};
