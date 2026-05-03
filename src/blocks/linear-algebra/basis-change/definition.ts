import type { BlockDefinition } from "~/blocks/types";
import { computeBasisChange } from "./compute";

export const BasisChangeBlock: BlockDefinition = {
  id: "la.basis-change",
  label: "Change of Basis",
  symbol: "P⁻¹TP",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "mathjs",
  color: "operation",
  inputs: [
    {
      id: "T",
      label: "T (transformation)",
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
    {
      id: "P",
      label: "P (new basis)",
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "TPrime",
      label: "T′ = P⁻¹·T·P",
      type: { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
    },
  ],
  compute: (inputs) => computeBasisChange(inputs),
  explain: {
    what: "Computes the representation of transformation T in the basis defined by the columns of P: T′ = P⁻¹·T·P.",
    why: "Change of basis is the key tool for diagonalizing matrices, simplifying differential equations, and understanding how linear maps look in different coordinate systems. If P is the eigenvector matrix of T, then T′ = P⁻¹·T·P is diagonal (the eigenvalues).",
    effect: (inputs) => {
      const T = inputs.T;
      const P = inputs.P;
      if (!T || !P) return "Awaiting inputs T and P.";
      const n = (T.payload as number[][]).length;
      return `Output is the ${n}×${n} matrix representing T in the coordinate system defined by the columns of P.`;
    },
    impact: () => "Similarity invariants are preserved: trace(T′) = trace(T) and det(T′) = det(T).",
  },
};
