import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeRref } from "./compute";

export const RrefBlock: BlockDefinition = {
  id: "la.rref",
  label: "Reduced row echelon form",
  symbol: "rref(A)",
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
      id: "rref",
      label: "rref(A)",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.m, n: A.n, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeRref(inputs),
  explain: {
    what: "Computes the reduced row echelon form (RREF) of a matrix using Gaussian elimination with partial pivoting.",
    why: "RREF reveals rank, null space, and solutions to linear systems in a canonical form — every leading entry is 1, all other entries in the pivot columns are 0, and zero rows are at the bottom.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)} (same shape as input).`;
    },
    impact: () =>
      "Downstream blocks see the canonical form. For rank computation, count non-zero rows. For null space, identify free variable columns.",
  },
};
