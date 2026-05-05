import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { ConicClassifyVisualization } from "./visualization";

export const VizConicClassifyBlock: BlockDefinition = {
  id: "viz.conic-classify",
  label: "Conic Classify",
  symbol: "⊙",
  category: "visualizer",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "conic",
      label: "Conic",
      type: { kind: "Conic" },
    },
  ],
  outputs: [],
  params: {},
  compute(): MathValue {
    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: {
        blockId: "viz.conic-classify",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  visualization: ConicClassifyVisualization,
  explain: {
    what: "Classifies a conic section (Ax²+Bxy+Cy²+Dx+Ey+F=0) into ellipse, parabola, hyperbola, circle, or degenerate using the discriminant B²-4AC and full 3×3 determinant.",
    why: "Conic classification is fundamental to analytic geometry and precalculus: it determines which geometric figure the equation represents.",
    effect: (inputs) => {
      if (!inputs.conic) return "Connect a Conic to classify it.";
      return "Shows conic family and discriminant details.";
    },
    impact: (_inputs, _output) => "Visual-only block; no mathematical output.",
  },
};
