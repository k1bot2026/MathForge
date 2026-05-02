import type { BlockDefinition } from "~/blocks/types";
import { computeVector2 } from "./compute";

export const Vector2Block: BlockDefinition = {
  id: "la.vector2",
  label: "Vector (2D)",
  symbol: "v",
  category: "source",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "v",
      label: "v",
      type: { kind: "Vector", n: 2, field: "real" },
    },
  ],
  params: {
    x: { kind: "number", default: 1, label: "x" },
    y: { kind: "number", default: 0, label: "y" },
  },
  compute: (_inputs, params) => computeVector2(params),
  explain: {
    what: "A two-component real vector (x, y).",
    why: "Lives in the plane — the smallest space where matrix transformations have a picture.",
    effect: (_inputs, output) => {
      const [x, y] = output.payload as [number, number];
      return `Outputs [${String(x)}, ${String(y)}].`;
    },
    impact: (_inputs, output) => {
      const [x, y] = output.payload as [number, number];
      const len = Math.hypot(x, y).toPrecision(4);
      return `Length ${len}; downstream blocks see a 2-vector in ℝ².`;
    },
  },
};
