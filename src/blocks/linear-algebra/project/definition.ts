import type { BlockDefinition } from "~/blocks/types";
import { computeProject } from "./compute";

export const ProjectBlock: BlockDefinition = {
  id: "la.project",
  label: "Orthogonal Projection",
  symbol: "P_A(v)",
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
    {
      id: "v",
      label: "v",
      type: { kind: "Vector", n: { var: "m" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "Pv",
      label: "P_A(v)",
      type: { kind: "Vector", n: { var: "m" }, field: "real" },
    },
  ],
  compute: (inputs) => computeProject(inputs),
  explain: {
    what: "Computes the orthogonal projection of v onto the subspace spanned by the columns of A. Formula: P·v = A·(AᵀA)⁻¹·Aᵀ·v. Requires A to have full column rank.",
    why: "Projection finds the closest point in a subspace — fundamental to least-squares regression, signal decomposition, and constraint handling in optimization.",
    effect: (_inputs, output) => {
      const pv = output.payload as number[];
      const norm = Math.sqrt(pv.reduce((s, x) => s + x * x, 0));
      return `Projection vector has norm ${norm.toFixed(4)}.`;
    },
    impact: () => "The residual v − P·v is orthogonal to the column space of A (normal equations).",
  },
};
