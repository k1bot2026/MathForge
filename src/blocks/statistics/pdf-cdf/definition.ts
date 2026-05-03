import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { PdfCdfVisualization } from "./visualization";

export const PdfCdfBlock: BlockDefinition = {
  id: "viz.pdf-cdf",
  label: "PDF / CDF",
  symbol: "ƒ(x)",
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
      throw new Error("viz.pdf-cdf requires a Distribution input on port X");
    }
    return X;
  },
  explain: {
    what: "Plots the probability density (or mass) function and cumulative distribution function of X side by side.",
    why: "Seeing PDF and CDF together makes distribution shape and tail behaviour immediately legible. Essential for understanding parametric choices before connecting to downstream operations.",
    effect: (inputs) => {
      const X = inputs.X;
      if (X === undefined) return "Connect a Distribution to see its PDF and CDF.";
      return `Showing PDF/CDF for ${X.type.kind === "Distribution" ? X.type.family : "unknown"} distribution.`;
    },
    impact: (_inputs, output) =>
      `Passes the same Distribution downstream (${output.type.kind === "Distribution" ? output.type.family : "?"}).`,
  },
  visualization: PdfCdfVisualization,
};
