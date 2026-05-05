import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { VizGeometry3dVisualization } from "./visualization";

export const VizGeometry3dBlock: BlockDefinition = {
  id: "viz.geometry-3d",
  label: "Geometry 3D",
  symbol: "⬡",
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
    { id: "shape4", label: "Shape 4", type: { kind: "Point", n: "any" }, required: false },
  ],
  outputs: [],
  params: {},
  compute(): MathValue {
    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: {
        blockId: "viz.geometry-3d",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  visualization: VizGeometry3dVisualization,
  explain: {
    what: "Renders up to four 3D geometry objects (Points, Lines, Spheres, Polygons) on an interactive 3D canvas with orbit controls.",
    why: "3D geometry is difficult to reason about from coordinates alone; visual rendering with OrbitControls lets users inspect spatial relationships from any angle.",
    effect: (inputs) => {
      const count = ["shape1", "shape2", "shape3", "shape4"].filter((k) => inputs[k]).length;
      if (count === 0) return "Connect geometry shapes to render them in 3D.";
      return `Rendering ${count} geometry object${count > 1 ? "s" : ""} in 3D.`;
    },
    impact: (_inputs, _output) => "Visual-only block; no mathematical output.",
  },
};
