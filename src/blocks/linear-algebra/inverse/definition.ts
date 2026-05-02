import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeInverse } from "./compute";

export const InverseBlock: BlockDefinition = {
  id: "la.inverse",
  label: "Matrix inverse",
  symbol: "A⁻¹",
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
      id: "inv",
      label: "A⁻¹",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.m, n: A.n, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeInverse(inputs),
  explain: {
    what: "Computes the inverse of a square, non-singular matrix using LU decomposition.",
    why: "A⁻¹ satisfies A·A⁻¹=I and solves A·x=b as x=A⁻¹·b — the foundation of direct linear solvers, control theory, and covariance inversion in statistics.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix. Singular inputs throw a typed error at evaluation time.`;
    },
  },
};
