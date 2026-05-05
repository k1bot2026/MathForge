import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { VizDynamicGeometryVisualization } from "./visualization";

export const VizDynamicGeometryBlock: BlockDefinition = {
  id: "viz.dynamic-geometry",
  label: "Dynamic Geometry",
  symbol: "⟡",
  category: "visualizer",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    { id: "shape1", label: "Shape 1", type: { kind: "Point", n: "any" }, required: false },
    { id: "shape2", label: "Shape 2", type: { kind: "Point", n: "any" }, required: false },
    { id: "shape3", label: "Shape 3", type: { kind: "Point", n: "any" }, required: false },
  ],
  outputs: [],
  params: {},
  compute(): MathValue {
    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: {
        blockId: "viz.dynamic-geometry",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  visualization: VizDynamicGeometryVisualization,
  explain: {
    what: "Interactive 2D geometry canvas with a draggable point. Drag the blue handle to move point P; the midpoint M and perpendicular bisector update live. Connected geometry shapes are rendered as static overlays.",
    why: "Dynamic geometry lets users develop geometric intuition by seeing how constructions respond to moving a defining element — the classic 'dynamic geometry' learning modality.",
    effect: (inputs) => {
      const count = ["shape1", "shape2", "shape3"].filter((k) => inputs[k]).length;
      if (count === 0)
        return "Drag the blue handle to explore the midpoint and perpendicular bisector construction.";
      return `Drag the blue handle to update the construction. ${count} shape${count > 1 ? "s" : ""} rendered as overlay.`;
    },
    impact: (_inputs, _output) => "Visual-only block; no mathematical output.",
  },
};
