// `viz.unit-grid` — visualizer block for 2D matrix transformations.
//
// Visualizers may pass-through (per docs/BLOCK_TAXONOMY.md) so downstream
// blocks can keep chaining; we forward the input M unchanged on the M
// output port and render the SVG plot inside the node body via the
// BlockDefinition.visualization hook.

import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { UnitGridVisualization } from "./visualization";

export const UnitGridBlock: BlockDefinition = {
  id: "viz.unit-grid",
  label: "Unit grid",
  symbol: "⊞",
  category: "visualizer",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "M",
      label: "M",
      type: { kind: "Matrix", m: 2, n: 2, field: "real" },
    },
  ],
  outputs: [
    {
      id: "M",
      label: "M (passthrough)",
      type: { kind: "Matrix", m: 2, n: 2, field: "real" },
    },
  ],
  compute: (inputs): MathValue => {
    const M = inputs.M;
    if (M === undefined) {
      throw new Error("viz.unit-grid requires a Matrix input on port M");
    }
    return M;
  },
  explain: {
    what: "Plots the transformed basis (M·e₁ and M·e₂) and the unit-square outline under M.",
    why: "Lets you see the geometric effect of the matrix at a glance — rotation, scale, shear, reflection.",
    effect: (inputs) => {
      const M = inputs.M?.payload as ReadonlyArray<ReadonlyArray<number>> | undefined;
      if (M === undefined) return "Connect a 2×2 matrix to see its effect on the basis.";
      const det = (M[0]?.[0] ?? 0) * (M[1]?.[1] ?? 0) - (M[0]?.[1] ?? 0) * (M[1]?.[0] ?? 0);
      return `det(M) = ${det.toPrecision(4)} — the unit square's signed area scales by this factor.`;
    },
    impact: (_inputs, output) => {
      const M = output.payload as ReadonlyArray<ReadonlyArray<number>>;
      return `Passes the same matrix downstream: ${M.length}×${M[0]?.length ?? 0}.`;
    },
  },
  visualization: UnitGridVisualization,
};
