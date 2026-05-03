import type { BlockDefinition } from "~/blocks/types";
import { computeKernel } from "./compute";

export const KernelBlock: BlockDefinition = {
  id: "la.kernel",
  label: "Kernel (Null Space)",
  symbol: "ker(A)",
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
      id: "K",
      label: "ker(A)",
      // Output shape is n×k where k = nullity (n − rank).
      // k is not statically known, so use "any" for the column dimension.
      type: { kind: "Matrix", m: { var: "n" }, n: "any", field: "real" },
    },
  ],
  compute: (inputs) => computeKernel(inputs),
  explain: {
    what: "Computes a basis for the null space (kernel) of A: the set of all vectors x such that A·x = 0. Output is an n×k matrix whose columns form a basis, where k = nullity(A) = n − rank(A).",
    why: "The kernel captures all directions that A collapses to zero. It determines whether Ax=b has a unique solution (kernel = {0}), infinitely many (kernel ≠ {0}), or none. Central to understanding linear maps, differential equations, and constraint satisfaction.",
    effect: (_inputs, output) => {
      const rows = output.payload as number[][];
      const k = rows[0]?.length ?? 0;
      const n = rows.length;
      if (k === 0) return `A has trivial null space — rank = ${n}, nullity = 0.`;
      return `Null space has dimension ${k} (nullity). Output is ${n}×${k} matrix; each column is a basis vector.`;
    },
    impact: () => "rank(A) + nullity(A) = n (rank-nullity theorem).",
  },
};
