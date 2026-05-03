import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { UnitGrid3dVisualization } from "./visualization";

function det3(m: ReadonlyArray<ReadonlyArray<number>>): number {
  const a = m[0]?.[0] ?? 0,
    b = m[0]?.[1] ?? 0,
    c = m[0]?.[2] ?? 0;
  const d = m[1]?.[0] ?? 0,
    e = m[1]?.[1] ?? 0,
    f = m[1]?.[2] ?? 0;
  const g = m[2]?.[0] ?? 0,
    h = m[2]?.[1] ?? 0,
    k = m[2]?.[2] ?? 0;
  return a * (e * k - f * h) - b * (d * k - f * g) + c * (d * h - e * g);
}

export const UnitGrid3dBlock: BlockDefinition = {
  id: "viz.unit-grid-3d",
  label: "Unit cube (3D)",
  symbol: "⊠",
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
      type: { kind: "Matrix", m: 3, n: 3, field: "real" },
    },
  ],
  outputs: [
    {
      id: "M",
      label: "M (passthrough)",
      type: { kind: "Matrix", m: 3, n: 3, field: "real" },
    },
  ],
  compute: (inputs): MathValue => {
    const M = inputs.M;
    if (M === undefined) {
      throw new Error("viz.unit-grid-3d requires a Matrix input on port M");
    }
    return M;
  },
  explain: {
    what: "Renders the unit cube [0,1]³ and its image under M as a 3D wireframe. Basis vectors M·e₁, M·e₂, M·e₃ are shown as colored arrows.",
    why: "Reveals the geometric effect of the 3×3 matrix — rotation, scale, shear, reflection — by showing how the unit cube is deformed.",
    effect: (inputs) => {
      const M = inputs.M?.payload as ReadonlyArray<ReadonlyArray<number>> | undefined;
      if (M === undefined) return "Connect a 3×3 matrix to see its effect on the unit cube.";
      const d = det3(M);
      return `det(M) = ${d.toPrecision(4)} — the unit cube's signed volume scales by this factor.`;
    },
    impact: (_inputs, output) => {
      const M = output.payload as ReadonlyArray<ReadonlyArray<number>>;
      return `Passes the same matrix downstream: ${M.length}×${M[0]?.length ?? 0}.`;
    },
  },
  visualization: UnitGrid3dVisualization,
};
