import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { JointHeatmapVisualization } from "./visualization";

export const JointHeatmapBlock: BlockDefinition = {
  id: "viz.joint-heatmap",
  label: "Joint Heatmap",
  symbol: "⊞",
  category: "visualizer",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "X",
      label: "X",
      type: { kind: "Distribution", family: "Normal" },
    },
    {
      id: "Y",
      label: "Y",
      type: { kind: "Distribution", family: "Normal" },
    },
  ],
  outputs: [
    {
      id: "X",
      label: "X (passthrough)",
      type: { kind: "Distribution", family: "Normal" },
    },
  ],
  compute: (inputs): MathValue => {
    const X = inputs.X;
    if (X === undefined) {
      throw new Error("viz.joint-heatmap requires Distribution inputs on X and Y");
    }
    return X;
  },
  explain: {
    what: "Renders a 2D joint density heatmap for two distributions X and Y, assuming independence: p(x,y) = p_X(x) · p_Y(y).",
    why: "Visualising the joint distribution reveals how the probability mass is spread over the joint support. Even under independence, the shape of the joint density changes substantially with the marginal parameters.",
    effect: (inputs) => {
      const X = inputs.X;
      const Y = inputs.Y;
      if (X === undefined || Y === undefined) return "Connect X and Y distributions.";
      return `Joint density of ${X.type.kind === "Distribution" ? X.type.family : "?"} × ${Y.type.kind === "Distribution" ? Y.type.family : "?"}.`;
    },
    impact: (_inputs, output) =>
      `Passes X (${output.type.kind === "Distribution" ? output.type.family : "?"}) downstream.`,
  },
  visualization: JointHeatmapVisualization,
};
