import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { Geometry2dVisualization } from "./visualization";

export const VizGeometry2dBlock: BlockDefinition = {
  id: "viz.geometry-2d",
  label: "Geometry 2D",
  symbol: "△",
  category: "visualizer",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "shape1",
      label: "Shape 1",
      type: { kind: "Point", n: 2 },
      required: false,
    },
    {
      id: "shape2",
      label: "Shape 2",
      type: { kind: "Point", n: 2 },
      required: false,
    },
    {
      id: "shape3",
      label: "Shape 3",
      type: { kind: "Point", n: 2 },
      required: false,
    },
    {
      id: "shape4",
      label: "Shape 4",
      type: { kind: "Point", n: 2 },
      required: false,
    },
  ],
  outputs: [],
  params: {},
  compute(): MathValue {
    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: {
        blockId: "viz.geometry-2d",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  visualization: Geometry2dVisualization,
  explain: {
    what: "Renders up to four 2D geometric objects (Points, Lines, Circles, Polygons) on an SVG canvas.",
    why: "Visual inspection is the primary way to verify and understand geometric constructions.",
    effect: (inputs) => {
      const count = Object.values(inputs).filter(Boolean).length;
      if (count === 0) return "Connect geometric shapes to visualize them.";
      return `Rendering ${count} geometric object${count === 1 ? "" : "s"}.`;
    },
    impact: (_inputs, _output) => "Visual-only block; no mathematical output.",
  },
};
