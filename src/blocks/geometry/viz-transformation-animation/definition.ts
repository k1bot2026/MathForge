import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { TransformationAnimationVisualization } from "./visualization";

export const VizTransformationAnimationBlock: BlockDefinition = {
  id: "viz.transformation-animation",
  label: "Transform Animation",
  symbol: "↭",
  category: "visualizer",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "source",
      label: "Source Polygon",
      type: { kind: "Polygon" },
    },
    {
      id: "transformed",
      label: "Transformed Polygon",
      type: { kind: "Polygon" },
    },
  ],
  outputs: [],
  params: {},
  compute(): MathValue {
    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: true,
      provenance: {
        blockId: "viz.transformation-animation",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  visualization: TransformationAnimationVisualization,
  explain: {
    what: "Animates a polygon morphing from its source shape to its transformed image, looping back and forth.",
    why: "Animation makes the effect of a geometric transformation (rotation, reflection, shear, etc.) instantly understandable.",
    effect: (inputs) => {
      if (!inputs.source || !inputs.transformed)
        return "Connect source and transformed polygons to animate the transformation.";
      return "Animating transformation from source to image polygon.";
    },
    impact: (_inputs, _output) => "Visual-only block; no mathematical output.",
  },
};
